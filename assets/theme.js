/* ==========================================================================
   Orlaven — Theme JS
   Handles: announcement rotation, mobile drawer, cart drawer + line updates,
   product form variant switching, gallery, quantity steppers, predictive
   search, hero slider, horizontal carousel arrows, modals, filter drawer.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const lockScroll   = () => document.documentElement.style.overflow = 'hidden';
  const unlockScroll = () => document.documentElement.style.overflow = '';

  /* ---------------------------------------------------------------- *
   * Announcement bar rotation
   * ---------------------------------------------------------------- */
  function initAnnouncement() {
    const bar = $('.announcement');
    if (!bar) return;
    const slides = $$('.announcement__slide', bar);
    if (slides.length <= 1) return;
    if (bar.dataset.autoplay !== 'true') return;
    const interval = parseInt(bar.dataset.interval, 10) || 4000;
    let idx = 0;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
    setInterval(() => {
      slides[idx].classList.remove('is-active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('is-active');
    }, interval);
  }

  /* ---------------------------------------------------------------- *
   * Mobile drawer
   * ---------------------------------------------------------------- */
  function initMobileDrawer() {
    const drawer = $('#MobileDrawer');
    const burger = $('.header__burger');
    const close  = $('[data-drawer-close]', drawer);
    if (!drawer || !burger) return;

    const open = () => {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      lockScroll();
    };
    const shut = () => {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      unlockScroll();
    };
    on(burger, 'click', open);
    on(close,  'click', shut);
    on(document, 'keydown', e => e.key === 'Escape' && shut());
  }

  /* ---------------------------------------------------------------- *
   * Search overlay
   * ---------------------------------------------------------------- */
  function initSearch() {
    const btn = $('[data-search-toggle]');
    const overlay = $('#SearchOverlay');
    if (!btn || !overlay) return;
    const close = $('[data-search-close]', overlay);
    const input = $('.search-overlay__input', overlay);
    const results = $('[data-predictive-results]', overlay);

    const open = () => { overlay.hidden = false; setTimeout(() => input?.focus(), 40); };
    const shut = () => { overlay.hidden = true; };

    on(btn, 'click', open);
    on(close, 'click', shut);
    on(document, 'keydown', e => e.key === 'Escape' && !overlay.hidden && shut());

    if (input && results) {
      let t;
      on(input, 'input', () => {
        clearTimeout(t);
        const q = input.value.trim();
        if (q.length < 2) { results.hidden = true; results.innerHTML = ''; return; }
        t = setTimeout(async () => {
          try {
            const res = await fetch(`/search/suggest?q=${encodeURIComponent(q)}&resources[type]=product,collection,article&section_id=predictive-search`);
            if (res.ok) {
              const html = await res.text();
              results.innerHTML = html;
              results.hidden = false;
            }
          } catch (_) { /* network - silent */ }
        }, 200);
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * Cart drawer
   * ---------------------------------------------------------------- */
  const Cart = {
    drawer: null, scrim: null, foot: null, body: null, countEls: [], form: null,

    init() {
      this.drawer  = $('#CartDrawer');
      this.scrim   = $('.cart-drawer__scrim');
      if (!this.drawer) return;
      this.body    = $('[data-cart-items]', this.drawer);
      this.foot    = $('[data-cart-foot]', this.drawer);
      this.form    = $('#CartDrawerForm');
      this.countEls = $$('[data-cart-count]');

      $$('[data-cart-toggle]').forEach(el => on(el, 'click', e => {
        // On cart page let the link follow
        if (window.location.pathname.endsWith('/cart')) return;
        e.preventDefault(); this.open();
      }));
      $$('[data-cart-close]').forEach(el => on(el, 'click', () => this.close()));
      on(document, 'keydown', e => e.key === 'Escape' && this.drawer.classList.contains('is-open') && this.close());

      // Qty and remove buttons (delegated)
      on(this.drawer, 'click', e => {
        const line = e.target.closest('.cart-line');
        if (!line) return;
        const key = line.dataset.key;
        if (e.target.matches('[data-qty-minus]')) {
          const input = line.querySelector('input[type=number]');
          input.value = Math.max(0, parseInt(input.value || 1, 10) - 1);
          this.update(key, parseInt(input.value, 10));
        }
        if (e.target.matches('[data-qty-plus]')) {
          const input = line.querySelector('input[type=number]');
          input.value = parseInt(input.value || 0, 10) + 1;
          this.update(key, parseInt(input.value, 10));
        }
        if (e.target.matches('[data-remove]')) {
          e.preventDefault();
          this.update(key, 0);
        }
      });

      // Handle cart/add forms from PDP and quick-add
      $$('form[data-product-form], form[data-quick-add]').forEach(form => {
        on(form, 'submit', async e => {
          e.preventDefault();
          const btn = form.querySelector('button[type=submit]');
          const original = btn?.textContent;
          if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
          try {
            const data = new FormData(form);
            data.append('sections', 'cart-drawer');
            const res = await fetch('/cart/add.js', { method: 'POST', headers: { 'Accept': 'application/json' }, body: data });
            if (!res.ok) throw new Error('add failed');
            await this.refresh();
            this.open();
          } catch (err) {
            console.error('Cart add failed', err);
          } finally {
            if (btn) { btn.disabled = false; btn.textContent = original; }
          }
        });
      });
    },

    open() { this.drawer.classList.add('is-open'); this.drawer.setAttribute('aria-hidden', 'false'); if (this.scrim) this.scrim.hidden = false; lockScroll(); },
    close() { this.drawer.classList.remove('is-open'); this.drawer.setAttribute('aria-hidden', 'true'); if (this.scrim) this.scrim.hidden = true; unlockScroll(); },

    async update(key, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
        if (!res.ok) throw new Error('update failed');
        await this.refresh();
      } catch (err) { console.error('Cart update failed', err); }
    },

    async refresh() {
      try {
        const res = await fetch('/cart?section_id=cart-drawer');
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Replace body + foot + subtotal + count
        const newBody = doc.querySelector('[data-cart-items]');
        const newFoot = doc.querySelector('[data-cart-foot]');
        if (newBody && this.body) this.body.innerHTML = newBody.innerHTML;
        if (newFoot && this.foot) {
          this.foot.innerHTML = newFoot.innerHTML;
          this.foot.hidden = false;
        }
        // Update count
        const cart = await fetch('/cart.js').then(r => r.json());
        this.countEls.forEach(el => { el.textContent = cart.item_count; });
        if (cart.item_count === 0 && this.foot) this.foot.hidden = true;
      } catch (err) { console.error('Cart refresh failed', err); }
    }
  };

  /* ---------------------------------------------------------------- *
   * Quantity steppers (non-cart, e.g. PDP)
   * ---------------------------------------------------------------- */
  function initQtySteppers() {
    document.addEventListener('click', e => {
      const qtyWrap = e.target.closest('.qty');
      if (!qtyWrap) return;
      const input = qtyWrap.querySelector('input[type=number]');
      if (!input) return;
      if (e.target.matches('[data-qty-minus]')) input.value = Math.max(parseInt(input.min || 0, 10), parseInt(input.value || 1, 10) - 1);
      if (e.target.matches('[data-qty-plus]'))  input.value = parseInt(input.value || 0, 10) + 1;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* ---------------------------------------------------------------- *
   * Product form (variant change)
   * ---------------------------------------------------------------- */
  async function getProductJSON(handle) {
    const res = await fetch(`/products/${handle}.js`);
    return res.json();
  }

  function initProductForm() {
    const form = $('form[data-product-form]');
    if (!form) return;
    const productHandle = window.location.pathname.split('/products/')[1]?.split('/')[0];
    if (!productHandle) return;

    let productData = null;
    getProductJSON(productHandle).then(d => (productData = d));

    const variantInput = $('[data-variant-id]', form);
    const addBtn = $('[data-add-btn]', form);
    const priceEl = $('.pdp__price', form.closest('.pdp__buybox'));

    const sync = () => {
      if (!productData) return;
      const selected = $$('input[type=radio]:checked', form).map(i => i.value);
      $$('[data-selected-value]', form).forEach((el, i) => { if (selected[i]) el.textContent = selected[i]; });
      const match = productData.variants.find(v =>
        v.options.every((opt, i) => opt === selected[i])
      );
      if (!match) return;
      variantInput.value = match.id;
      // Update price
      if (priceEl) {
        if (match.compare_at_price > match.price) {
          priceEl.innerHTML = `<span class="price"><span class="price__sale">${Shopify.formatMoney(match.price)}</span> <span class="price__compare">${Shopify.formatMoney(match.compare_at_price)}</span></span>`;
        } else {
          priceEl.innerHTML = `<span class="price">${Shopify.formatMoney(match.price)}</span>`;
        }
      }
      // Update button
      if (addBtn) {
        addBtn.disabled = !match.available;
        addBtn.textContent = match.available ? 'Add to bag' : 'Sold out';
      }
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('variant', match.id);
      history.replaceState({}, '', url);
    };

    form.addEventListener('change', e => { if (e.target.matches('input[type=radio]')) sync(); });
  }

  // Minimal money formatter (expects shop.money_format pattern, but supports ${{amount}} only).
  window.Shopify = window.Shopify || {};
  Shopify.formatMoney = Shopify.formatMoney || function (cents) {
    const v = (cents / 100).toFixed(2);
    return `$${v.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  /* ---------------------------------------------------------------- *
   * PDP gallery (thumb → main)
   * ---------------------------------------------------------------- */
  function initGallery() {
    const thumbs = $$('.pdp__thumb');
    const slides = $$('.pdp__slide');
    if (thumbs.length === 0) return;
    thumbs.forEach(t => on(t, 'click', () => {
      const idx = t.dataset.thumb;
      thumbs.forEach(x => x.classList.toggle('is-active', x.dataset.thumb === idx));
      slides.forEach(s => s.classList.toggle('is-active', s.dataset.slide === idx));
    }));
  }

  /* ---------------------------------------------------------------- *
   * Hero slider
   * ---------------------------------------------------------------- */
  function initHeroSlider() {
    $$('.hero-slider').forEach(slider => {
      const slides = $$('.hero-slider__slide', slider);
      const dots   = $$('.hero-slider__dot',   slider);
      if (slides.length <= 1) { slides[0]?.classList.add('is-active'); return; }
      let idx = 0;
      const go = (i) => {
        idx = (i + slides.length) % slides.length;
        slides.forEach((s, si) => s.classList.toggle('is-active', si === idx));
        dots.forEach((d, di) => d.classList.toggle('is-active', di === idx));
      };
      go(0);
      dots.forEach((d, di) => on(d, 'click', () => { go(di); reset(); }));

      let timer;
      const autoplay = slider.dataset.autoplay === 'true';
      const interval = parseInt(slider.dataset.interval, 10) || 6000;
      const start = () => { if (autoplay) timer = setInterval(() => go(idx + 1), interval); };
      const reset = () => { clearInterval(timer); start(); };
      start();

      on(slider, 'mouseenter', () => clearInterval(timer));
      on(slider, 'mouseleave', start);
    });
  }

  /* ---------------------------------------------------------------- *
   * Horizontal carousel arrows (featured collection)
   * ---------------------------------------------------------------- */
  function initCarousels() {
    $$('[data-carousel]').forEach(car => {
      const track = $('.featured__track', car);
      if (!track) return;
      const step = () => Math.max(track.clientWidth * 0.8, 300);
      on($('[data-carousel-prev]', car), 'click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      on($('[data-carousel-next]', car), 'click', () => track.scrollBy({ left:  step(),  behavior: 'smooth' }));
    });
  }

  /* ---------------------------------------------------------------- *
   * Modals (size guide)
   * ---------------------------------------------------------------- */
  function initModals() {
    $$('[data-modal-open]').forEach(btn => on(btn, 'click', () => {
      const id = btn.dataset.modalOpen;
      const modal = document.getElementById(id);
      if (modal) { modal.hidden = false; lockScroll(); }
    }));
    document.addEventListener('click', e => {
      if (e.target.matches('[data-modal-close], .modal__scrim')) {
        const modal = e.target.closest('.modal');
        if (modal) { modal.hidden = true; unlockScroll(); }
      }
    });
    on(document, 'keydown', e => {
      if (e.key === 'Escape') {
        $$('.modal').forEach(m => { if (!m.hidden) { m.hidden = true; unlockScroll(); } });
      }
    });
  }

  /* ---------------------------------------------------------------- *
   * Collection filter drawer (mobile) + delete-address helper
   * ---------------------------------------------------------------- */
  function initFiltersToggle() {
    const toggle = $('[data-filter-toggle]');
    const panel  = $('[data-filters]');
    if (!toggle || !panel) return;
    on(toggle, 'click', () => panel.classList.toggle('is-open'));
  }

  function initDeleteAddress() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-delete-address]');
      if (!btn) return;
      if (!confirm('Delete this address?')) return;
      // Shopify default URL pattern: /account/addresses/:id with method=delete
      const url = btn.dataset.deleteAddress;
      const form = document.createElement('form');
      form.method = 'post'; form.action = url;
      form.innerHTML = '<input type="hidden" name="_method" value="delete">';
      document.body.appendChild(form);
      form.submit();
    });
  }

  /* ---------------------------------------------------------------- *
   * Gift-card code copy
   * ---------------------------------------------------------------- */
  function initGiftCardCopy() {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => (btn.textContent = original), 1800);
      } catch (_) { /* ignore */ }
    });
  }

  /* ---------------------------------------------------------------- *
   * Scroll reveal (progressive enhancement, no-op if IO missing)
   * ---------------------------------------------------------------- */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    $$('.section').forEach(s => io.observe(s));
  }

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initAnnouncement();
    initMobileDrawer();
    initSearch();
    Cart.init();
    initQtySteppers();
    initProductForm();
    initGallery();
    initHeroSlider();
    initCarousels();
    initModals();
    initFiltersToggle();
    initDeleteAddress();
    initGiftCardCopy();
    initReveal();
  });
})();
