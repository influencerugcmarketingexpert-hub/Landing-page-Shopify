/* ============================================================================
 * Orlaven | product.js
 *
 * Product-page custom elements:
 *
 *   <product-form>            - intercepts submit, routes to window.theme.cart.add
 *   <media-gallery>            - thumbnails + main stage, lightbox via <modal-dialog>
 *   <variant-radios>           - radio-driven variant picker
 *   <variant-selects>          - select-driven variant picker
 *   <product-info>             - scopes a variant change and fans events into
 *                                the form / price / gallery / sticky buy bar
 *   <product-recommendations>  - fetches /recommendations/products.json
 *   <recently-viewed>          - stores handles in localStorage, fetches JSON
 *                                details for rendering compact cards
 *   <sticky-buy-bar>           - visible when main ATC scrolls out of view
 *
 * Depends on:
 *   window.routes        - set by layout/theme.liquid
 *   window.theme         - set by assets/global.js (PubSub, events, formatMoney)
 *   window.theme.cart.add - set by assets/cart.js (the single add-to-cart entry)
 *
 * Publishes canonical events via window.theme.PubSub:
 *   product:variant-change  { variant, sectionId, productId }
 *   product:quick-add       (re-published by cart.add after a successful add)
 * ========================================================================== */

(function () {
  'use strict';

  var theme = window.theme || {};
  var PubSub = theme.PubSub || { publish: function () {}, subscribe: function () { return function () {}; } };
  var events = theme.events || {
    variantChange: 'product:variant-change',
    quickAdd: 'product:quick-add',
    cartError: 'cart:error',
    cartOpen: 'cart:open',
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function money(cents) {
    if (theme.formatMoney) return theme.formatMoney(cents);
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  function closestSection(el) {
    return el && el.closest('[data-section-id]');
  }

  function getProductInfo(el) {
    return el && el.closest('product-info');
  }

  // A light CSS-named-color fallback for color swatches.
  var COLOR_MAP = {
    espresso: '#2B1F17',
    cognac: '#9A5A3C',
    black: '#0F0F0F',
    ivory: '#F5EFE6',
    cream: '#F5EFE6',
    fawn: '#D9C6A5',
    oxblood: '#4B1E1E',
    tan: '#C9A07A',
    camel: '#C19A6B',
    chestnut: '#6E3B2A',
    walnut: '#5B3A29',
    honey: '#C68E17',
    sand: '#E4D3B2',
    navy: '#1B2A41',
    olive: '#5B6630',
    bone: '#EDE4D3',
    stone: '#B6AE9A',
    charcoal: '#36393B',
    grey: '#808080',
    gray: '#808080',
    white: '#FFFFFF',
    red: '#B23A30',
    burgundy: '#6B1F2A',
    blue: '#1B4D7A',
    green: '#344E41',
    brown: '#5A3A22'
  };

  function resolveSwatchColor(value) {
    if (!value) return 'currentColor';
    var key = String(value).toLowerCase().trim().replace(/\s+/g, '');
    if (COLOR_MAP[key]) return COLOR_MAP[key];
    // CSS accepts CSS named colors (e.g. "slategrey") and hex/rgb values
    // directly. Pass through.
    if (/^#|^rgb|^hsl/.test(key)) return value;
    return value;
  }

  // ---------------------------------------------------------------------------
  // <product-info>
  //
  // Wraps the product detail region. Its job is to capture variant-change events
  // from a child variant-picker and fan them out to the media gallery, price,
  // form and sticky buy bar that share its section id.
  // ---------------------------------------------------------------------------
  class ProductInfo extends HTMLElement {
    constructor() {
      super();
      this._onVariantChange = this._onVariantChange.bind(this);
    }

    connectedCallback() {
      this.sectionId = this.getAttribute('data-section-id') || '';
      this.productId = this.getAttribute('data-product-id') || '';
      this.productHandle = this.getAttribute('data-product-handle') || '';
      this.productData = this._parseProductJson();
      this._sub = PubSub.subscribe(events.variantChange, this._onVariantChange);
      this._rememberAsRecentlyViewed();
    }

    disconnectedCallback() {
      if (this._sub) try { this._sub(); } catch (e) {}
    }

    _parseProductJson() {
      var script = this.querySelector('[data-product-json]');
      if (!script) return null;
      try {
        return JSON.parse(script.textContent);
      } catch (err) {
        return null;
      }
    }

    getProduct() {
      return this.productData;
    }

    _onVariantChange(data) {
      if (!data || !data.variant) return;
      if (data.sectionId && data.sectionId !== this.sectionId) return;
      var variant = data.variant;
      this._updateUrl(variant);
      this._updateGallery(variant);
      this._updatePrice(variant);
      this._updateSku(variant);
      this._updateStockMessage(variant);
      this._updateFormInput(variant);
      this._updateStickyBar(variant);
    }

    _updateUrl(variant) {
      if (!variant || !variant.id) return;
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', String(variant.id));
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}
    }

    _updateGallery(variant) {
      var gallery = this.querySelector('media-gallery');
      if (!gallery || typeof gallery.showMedia !== 'function') return;
      if (variant && variant.featured_media) gallery.showMedia(variant.featured_media.id);
    }

    _updatePrice(variant) {
      var priceRoot = this.querySelector('[data-variant-price]');
      if (!priceRoot) return;
      if (!variant) {
        priceRoot.innerHTML = '';
        return;
      }
      var current = priceRoot.querySelector('[data-variant-price-current]');
      if (current) current.textContent = money(variant.price);
      var compare = priceRoot.querySelector('[data-variant-price-compare]');
      if (compare) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          compare.textContent = money(variant.compare_at_price);
          compare.hidden = false;
        } else {
          compare.textContent = '';
          compare.hidden = true;
        }
      }
    }

    _updateSku(variant) {
      var sku = this.querySelector('[data-variant-sku]');
      if (!sku) return;
      if (variant && variant.sku) {
        sku.textContent = variant.sku;
        sku.hidden = false;
      } else {
        sku.hidden = true;
      }
    }

    _updateStockMessage(variant) {
      var stock = this.querySelector('[data-variant-stock]');
      if (!stock) return;
      if (!variant) {
        stock.textContent = '';
        return;
      }
      if (!variant.available) {
        stock.textContent = stock.getAttribute('data-text-out-of-stock') || 'Out of stock';
        stock.setAttribute('data-state', 'out');
      } else {
        stock.textContent = stock.getAttribute('data-text-in-stock') || 'In stock';
        stock.setAttribute('data-state', 'in');
      }
    }

    _updateFormInput(variant) {
      var inputs = this.querySelectorAll('product-form input[name="id"]');
      inputs.forEach(function (input) {
        input.value = variant && variant.id ? String(variant.id) : '';
      });
      var atcButtons = this.querySelectorAll('[data-atc-button]');
      atcButtons.forEach(function (btn) {
        if (!variant || !variant.available) {
          btn.setAttribute('disabled', '');
          var label = btn.querySelector('[data-atc-label]') || btn;
          label.textContent = btn.getAttribute('data-text-unavailable') || 'Unavailable';
        } else {
          btn.removeAttribute('disabled');
          var lbl = btn.querySelector('[data-atc-label]') || btn;
          lbl.textContent = btn.getAttribute('data-text-default') || 'Add to bag';
        }
      });
    }

    _updateStickyBar(variant) {
      var bar = this.querySelector('sticky-buy-bar');
      if (bar && typeof bar.updateVariant === 'function') bar.updateVariant(variant);
    }

    _rememberAsRecentlyViewed() {
      if (!this.productHandle) return;
      try {
        var key = 'orlaven.recentlyViewed';
        var handle = this.productHandle;
        var list = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(list)) list = [];
        list = list.filter(function (h) { return h && h !== handle; });
        list.unshift(handle);
        if (list.length > 8) list = list.slice(0, 8);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        // localStorage may be unavailable in private mode; silent.
      }
    }
  }
  if (!customElements.get('product-info')) customElements.define('product-info', ProductInfo);

  // ---------------------------------------------------------------------------
  // <media-gallery>
  //
  // Thumbnails + main stage. Supports media types image, video, external_video
  // and model_3d. Thumbnail click swaps the main slide. A lightbox is opened
  // via a <modal-dialog> sibling (expected to be in the DOM with
  // id="MediaLightbox-<sectionId>").
  // ---------------------------------------------------------------------------
  class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this._onThumbClick = this._onThumbClick.bind(this);
      this._onZoom = this._onZoom.bind(this);
      this._onKey = this._onKey.bind(this);
    }

    connectedCallback() {
      this.sectionId = this.getAttribute('data-section-id') || '';
      this.thumbs = Array.from(this.querySelectorAll('[data-media-thumb]'));
      this.slides = Array.from(this.querySelectorAll('[data-media-slide]'));
      this.lightbox = document.getElementById('MediaLightbox-' + this.sectionId);
      var self = this;
      this.thumbs.forEach(function (t) { t.addEventListener('click', self._onThumbClick); });
      this.querySelectorAll('[data-media-zoom]').forEach(function (btn) {
        btn.addEventListener('click', self._onZoom);
      });
      this.addEventListener('keydown', this._onKey);
      var active = this.slides.find(function (s) { return s.getAttribute('data-active') === 'true'; });
      if (!active && this.slides[0]) this.showMedia(this.slides[0].getAttribute('data-media-id'));
    }

    disconnectedCallback() {
      var self = this;
      this.thumbs.forEach(function (t) { t.removeEventListener('click', self._onThumbClick); });
      this.removeEventListener('keydown', this._onKey);
    }

    _onThumbClick(event) {
      event.preventDefault();
      var btn = event.currentTarget;
      var id = btn.getAttribute('data-media-id');
      this.showMedia(id);
      btn.focus({ preventScroll: true });
    }

    _onZoom(event) {
      event.preventDefault();
      if (!this.lightbox || typeof this.lightbox.open !== 'function') return;
      var id = event.currentTarget.getAttribute('data-media-id');
      if (id) {
        var inner = this.lightbox.querySelector('media-gallery');
        if (inner && typeof inner.showMedia === 'function') inner.showMedia(id);
      }
      this.lightbox.open(event.currentTarget);
    }

    _onKey(event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      var activeIdx = this.slides.findIndex(function (s) { return s.getAttribute('data-active') === 'true'; });
      if (activeIdx === -1) return;
      var next = event.key === 'ArrowLeft' ? activeIdx - 1 : activeIdx + 1;
      if (next < 0) next = this.slides.length - 1;
      if (next >= this.slides.length) next = 0;
      var target = this.slides[next];
      if (target) {
        event.preventDefault();
        this.showMedia(target.getAttribute('data-media-id'));
      }
    }

    showMedia(mediaId) {
      if (!mediaId) return;
      var sid = String(mediaId);
      this.slides.forEach(function (slide) {
        var match = slide.getAttribute('data-media-id') === sid;
        if (match) {
          slide.setAttribute('data-active', 'true');
          slide.removeAttribute('hidden');
        } else {
          slide.removeAttribute('data-active');
          slide.setAttribute('hidden', '');
          // Pause any playing videos when swapping away.
          var video = slide.querySelector('video');
          if (video && typeof video.pause === 'function') { try { video.pause(); } catch (e) {} }
        }
      });
      this.thumbs.forEach(function (thumb) {
        var match = thumb.getAttribute('data-media-id') === sid;
        if (match) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      });
    }
  }
  if (!customElements.get('media-gallery')) customElements.define('media-gallery', MediaGallery);

  // ---------------------------------------------------------------------------
  // Shared variant resolver. Reads the product-info ancestor's product JSON
  // and picks the variant that matches the selected option values.
  // ---------------------------------------------------------------------------
  function resolveVariant(host, selectedValues) {
    var info = getProductInfo(host);
    if (!info) return null;
    var product = info.getProduct();
    if (!product || !product.variants) return null;
    return product.variants.find(function (v) {
      return v.options.every(function (opt, i) { return opt === selectedValues[i]; });
    }) || null;
  }

  function publishVariantChange(host, variant) {
    var info = getProductInfo(host);
    PubSub.publish(events.variantChange, {
      variant: variant,
      sectionId: info && info.sectionId,
      productId: info && info.productId,
    });
  }

  // ---------------------------------------------------------------------------
  // <variant-radios> - radio/button groups
  // ---------------------------------------------------------------------------
  class VariantRadios extends HTMLElement {
    constructor() {
      super();
      this._onChange = this._onChange.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
    }

    connectedCallback() {
      this.addEventListener('change', this._onChange);
      this.addEventListener('click', this._onClick);
      this.addEventListener('keydown', this._onKeyDown);
      // Set initial roving tabindex without firing a variant-change event.
      var self = this;
      this.querySelectorAll('[data-variant-option-button]').forEach(function (btn) {
        var name = btn.getAttribute('data-option-name');
        var value = btn.getAttribute('data-option-value');
        var match = self.querySelector('input[type="radio"][name="' + name + '"]:checked');
        var isChecked = match && match.value === value;
        btn.setAttribute('tabindex', isChecked ? '0' : '-1');
      });
    }

    disconnectedCallback() {
      this.removeEventListener('change', this._onChange);
      this.removeEventListener('click', this._onClick);
      this.removeEventListener('keydown', this._onKeyDown);
    }

    _onChange(event) {
      var input = event.target.closest('input[type="radio"]');
      if (!input) return;
      this._propagate();
    }

    _onClick(event) {
      var btn = event.target.closest('[data-variant-option-button]');
      if (!btn) return;
      var groupName = btn.getAttribute('data-option-name');
      var value = btn.getAttribute('data-option-value');
      var radio = this.querySelector('input[type="radio"][name="' + groupName + '"][value="' + value + '"]');
      if (radio) {
        radio.checked = true;
        this._propagate();
      }
    }

    _onKeyDown(event) {
      var key = event.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown' &&
          key !== 'Home' && key !== 'End') return;
      var btn = event.target.closest('[data-variant-option-button]');
      if (!btn) return;
      var group = btn.closest('[role="radiogroup"]') || btn.closest('fieldset');
      if (!group) return;
      var buttons = Array.from(group.querySelectorAll('[data-variant-option-button]'))
        .filter(function (b) { return b.getAttribute('aria-disabled') !== 'true'; });
      if (!buttons.length) return;
      var idx = buttons.indexOf(btn);
      if (idx === -1) return;
      var next = idx;
      if (key === 'ArrowRight' || key === 'ArrowDown') next = (idx + 1) % buttons.length;
      else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (idx - 1 + buttons.length) % buttons.length;
      else if (key === 'Home') next = 0;
      else if (key === 'End') next = buttons.length - 1;
      event.preventDefault();
      var target = buttons[next];
      var groupName = target.getAttribute('data-option-name');
      var value = target.getAttribute('data-option-value');
      var radio = this.querySelector('input[type="radio"][name="' + groupName + '"][value="' + value + '"]');
      if (radio) {
        radio.checked = true;
        this._propagate();
      }
      target.focus();
    }

    _propagate() {
      var selected = Array.from(this.querySelectorAll('fieldset[data-option-index]')).map(function (fs) {
        var checked = fs.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : '';
      });
      var variant = resolveVariant(this, selected);
      publishVariantChange(this, variant);

      // Reflect active state on pill/swatch buttons and roving tabindex
      // so ArrowLeft/Right keyboard navigation within each radiogroup
      // only steps through one focusable at a time.
      var self = this;
      this.querySelectorAll('[data-variant-option-button]').forEach(function (btn) {
        var name = btn.getAttribute('data-option-name');
        var value = btn.getAttribute('data-option-value');
        var match = self.querySelector('input[type="radio"][name="' + name + '"]:checked');
        var isChecked = match && match.value === value;
        btn.setAttribute('aria-checked', isChecked ? 'true' : 'false');
        btn.setAttribute('tabindex', isChecked ? '0' : '-1');
      });
    }
  }
  if (!customElements.get('variant-radios')) customElements.define('variant-radios', VariantRadios);

  // ---------------------------------------------------------------------------
  // <variant-selects> - plain <select> based picker
  // ---------------------------------------------------------------------------
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this._onChange = this._onChange.bind(this);
    }

    connectedCallback() {
      this.addEventListener('change', this._onChange);
    }

    disconnectedCallback() {
      this.removeEventListener('change', this._onChange);
    }

    _onChange() {
      var selected = Array.from(this.querySelectorAll('select[data-option-index]')).map(function (s) {
        return s.value;
      });
      var variant = resolveVariant(this, selected);
      publishVariantChange(this, variant);
    }
  }
  if (!customElements.get('variant-selects')) customElements.define('variant-selects', VariantSelects);

  // ---------------------------------------------------------------------------
  // <product-form>
  //
  // Intercepts submit, calls window.theme.cart.add. On error renders the
  // message in [data-product-form-error]. On success, cart.js has already
  // published product:quick-add which the cart drawer subscribes to.
  // ---------------------------------------------------------------------------
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this._onSubmit = this._onSubmit.bind(this);
    }

    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.errorEl = this.querySelector('[data-product-form-error]');
      this.submitButton = this.form.querySelector('[type="submit"], [data-atc-button]');
      this.form.addEventListener('submit', this._onSubmit);
    }

    disconnectedCallback() {
      if (this.form) this.form.removeEventListener('submit', this._onSubmit);
    }

    _onSubmit(event) {
      event.preventDefault();
      if (!this.form) return;

      this._hideError();
      this._setLoading(true);

      var formData = new FormData(this.form);
      var id = parseInt(formData.get('id'), 10);
      var quantity = parseInt(formData.get('quantity') || '1', 10) || 1;
      var properties = {};
      formData.forEach(function (value, key) {
        var match = key.match(/^properties\[(.+)\]$/);
        if (match && value !== '') properties[match[1]] = value;
      });

      var payload = { id: id, quantity: quantity };
      if (Object.keys(properties).length) payload.properties = properties;

      var self = this;
      var addFn = (window.theme && window.theme.cart && window.theme.cart.add);
      var request = addFn
        ? addFn(payload)
        : fetch(window.routes.cart_add_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(payload),
          }).then(function (r) { return r.ok ? r.json() : r.json().then(function (b) { throw b; }); })
            .then(function (body) { PubSub.publish(events.quickAdd, body); return body; });

      Promise.resolve(request).then(function () {
        self._setLoading(false);
      }).catch(function (err) {
        self._setLoading(false);
        self._showError(self._extractMessage(err));
      });
    }

    _setLoading(loading) {
      if (!this.submitButton) return;
      if (loading) {
        this.submitButton.setAttribute('aria-busy', 'true');
        this.submitButton.classList.add('is-loading');
      } else {
        this.submitButton.removeAttribute('aria-busy');
        this.submitButton.classList.remove('is-loading');
      }
    }

    _hideError() {
      if (!this.errorEl) return;
      this.errorEl.textContent = '';
      this.errorEl.hidden = true;
    }

    _showError(message) {
      if (!this.errorEl) return;
      this.errorEl.textContent = message || 'Something went wrong adding this item. Please try again.';
      this.errorEl.hidden = false;
    }

    _extractMessage(err) {
      if (!err) return '';
      if (typeof err === 'string') return err;
      if (err.description) return err.description;
      if (err.message) return err.message;
      return '';
    }
  }
  if (!customElements.get('product-form')) customElements.define('product-form', ProductForm);

  // ---------------------------------------------------------------------------
  // <sticky-buy-bar>
  //
  // Shows a compact fixed-bottom bar on mobile when the main add-to-cart
  // button scrolls out of view. Uses IntersectionObserver on the element
  // identified by data-observe-target (expected to be a css selector resolved
  // against the nearest product-info).
  // ---------------------------------------------------------------------------
  class StickyBuyBar extends HTMLElement {
    constructor() {
      super();
      this._onClick = this._onClick.bind(this);
    }

    connectedCallback() {
      this.info = getProductInfo(this) || document;
      var selector = this.getAttribute('data-observe-target') || '[data-atc-button]';
      var target = this.info.querySelector(selector);
      if (!target || !('IntersectionObserver' in window)) {
        // Without IO we just always hide.
        this.setAttribute('hidden', '');
        return;
      }
      var self = this;
      this.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self.setAttribute('hidden', '');
            self.classList.remove('is-visible');
          } else {
            self.removeAttribute('hidden');
            self.classList.add('is-visible');
          }
        });
      }, { rootMargin: '0px', threshold: 0 });
      this.observer.observe(target);
      this.addEventListener('click', this._onClick);
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      this.removeEventListener('click', this._onClick);
    }

    _onClick(event) {
      var btn = event.target.closest('[data-sticky-atc]');
      if (!btn) return;
      event.preventDefault();
      var target = this.info.querySelector('[data-atc-button]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(function () { target.click(); }, 450);
      }
    }

    updateVariant(variant) {
      if (!variant) return;
      var priceEl = this.querySelector('[data-sticky-price]');
      if (priceEl) priceEl.textContent = money(variant.price);
      var atc = this.querySelector('[data-sticky-atc]');
      if (atc) {
        if (!variant.available) {
          atc.setAttribute('disabled', '');
          atc.textContent = atc.getAttribute('data-text-unavailable') || 'Sold out';
        } else {
          atc.removeAttribute('disabled');
          atc.textContent = atc.getAttribute('data-text-default') || 'Add to bag';
        }
      }
    }
  }
  if (!customElements.get('sticky-buy-bar')) customElements.define('sticky-buy-bar', StickyBuyBar);

  // ---------------------------------------------------------------------------
  // <product-recommendations>
  //
  // Lazily fetches /recommendations/products.json?section_id=... and swaps
  // the inner markup with the server-rendered section response.
  // ---------------------------------------------------------------------------
  class ProductRecommendations extends HTMLElement {
    constructor() {
      super();
      this._onVisible = this._onVisible.bind(this);
    }

    connectedCallback() {
      this.productId = this.getAttribute('data-product-id');
      this.sectionId = this.getAttribute('data-section-id');
      this.limit = parseInt(this.getAttribute('data-limit'), 10) || 4;
      this.intent = this.getAttribute('data-intent') || 'related';
      if (!this.productId || !this.sectionId) return;
      if ('IntersectionObserver' in window) {
        this._observer = new IntersectionObserver(this._onVisible, { rootMargin: '400px 0px' });
        this._observer.observe(this);
      } else {
        this._load();
      }
    }

    disconnectedCallback() {
      if (this._observer) this._observer.disconnect();
    }

    _onVisible(entries) {
      var self = this;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        self._observer.disconnect();
        self._load();
      });
    }

    _load() {
      var params = new URLSearchParams();
      params.set('section_id', this.sectionId);
      params.set('product_id', this.productId);
      params.set('limit', String(this.limit));
      params.set('intent', this.intent);
      var url = '/recommendations/products?' + params.toString();
      var self = this;
      fetch(url, { headers: { Accept: 'text/html' } })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          if (!html) {
            self.setAttribute('data-empty', '');
            return;
          }
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          // The rendered section wraps its payload in the element we are in.
          // Match the inner list/grid and swap.
          var incoming = doc.querySelector('product-recommendations') || doc.body.firstElementChild;
          if (incoming) {
            self.innerHTML = incoming.innerHTML;
            if (theme.initLazyImages) theme.initLazyImages(self);
          } else {
            self.setAttribute('data-empty', '');
          }
        })
        .catch(function () { self.setAttribute('data-empty', ''); });
    }
  }
  if (!customElements.get('product-recommendations')) customElements.define('product-recommendations', ProductRecommendations);

  // ---------------------------------------------------------------------------
  // <recently-viewed>
  //
  // Stores product handles in localStorage under 'orlaven.recentlyViewed'.
  // On a product page the <product-info> element seeds the list with the
  // current handle. On any page this element renders the stored handles by
  // fetching /products/<handle>.js for each and producing compact cards.
  // ---------------------------------------------------------------------------
  class RecentlyViewed extends HTMLElement {
    connectedCallback() {
      this.limit = parseInt(this.getAttribute('data-limit'), 10) || 8;
      this.excludeHandle = this.getAttribute('data-exclude-handle') || '';
      this.listEl = this.querySelector('[data-recently-viewed-list]');
      this.emptyEl = this.querySelector('[data-recently-viewed-empty]');
      this._render();
    }

    _getHandles() {
      try {
        var raw = localStorage.getItem('orlaven.recentlyViewed');
        var list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        var excl = this.excludeHandle;
        return list.filter(function (h) { return h && h !== excl; }).slice(0, this.limit);
      } catch (e) {
        return [];
      }
    }

    _render() {
      var handles = this._getHandles();
      if (!handles.length) {
        this.setAttribute('data-empty', '');
        if (this.emptyEl) this.emptyEl.hidden = false;
        if (this.listEl) this.listEl.hidden = true;
        return;
      }
      this.removeAttribute('data-empty');
      if (this.emptyEl) this.emptyEl.hidden = true;
      if (this.listEl) this.listEl.hidden = false;
      var self = this;
      Promise.all(handles.map(function (h) {
        return fetch('/products/' + encodeURIComponent(h) + '.js', { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
      })).then(function (products) {
        var items = products.filter(Boolean);
        if (!items.length) {
          self.setAttribute('data-empty', '');
          if (self.emptyEl) self.emptyEl.hidden = false;
          if (self.listEl) self.listEl.hidden = true;
          return;
        }
        if (!self.listEl) return;
        self.listEl.innerHTML = items.map(function (p) { return self._cardHtml(p); }).join('');
        if (theme.initLazyImages) theme.initLazyImages(self.listEl);
      });
    }

    _cardHtml(product) {
      var img = product.featured_image || (product.images && product.images[0]) || '';
      var src = img ? (img.indexOf('//') === 0 ? 'https:' + img : img) : '';
      var price = product.price != null ? money(product.price) : '';
      var compare = product.compare_at_price != null && product.compare_at_price > product.price
        ? money(product.compare_at_price) : '';
      var title = (product.title || '').replace(/</g, '&lt;');
      var url = product.url || ('/products/' + product.handle);
      return (
        '<article class="product-card card product-card--compact">' +
          '<a class="product-card__link" href="' + url + '">' +
            '<div class="card__media card__media--portrait">' +
              (src
                ? '<img loading="lazy" decoding="async" src="' + src + '" alt="' + title + '" class="card__media-primary">'
                : '') +
            '</div>' +
          '</a>' +
          '<div class="card__body product-card__body">' +
            '<h3 class="card__title product-card__title"><a href="' + url + '">' + title + '</a></h3>' +
            '<div class="product-card__price"><span class="price">' +
              '<span class="price__current">' + price + '</span>' +
              (compare ? '<s class="price__compare">' + compare + '</s>' : '') +
            '</span></div>' +
          '</div>' +
        '</article>'
      );
    }
  }
  if (!customElements.get('recently-viewed')) customElements.define('recently-viewed', RecentlyViewed);

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------
  window.theme = Object.assign(window.theme || {}, {
    product: Object.assign({}, (window.theme && window.theme.product) || {}, {
      resolveSwatchColor: resolveSwatchColor,
      COLOR_MAP: COLOR_MAP,
    }),
  });
}());
