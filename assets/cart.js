/* ============================================================================
 * Orlaven | cart.js
 *
 * Defines three custom elements:
 *   <cart-drawer>      - slide-in bag drawer with open/close + section re-render
 *   <cart-items>       - interior lines manager (qty change, remove)
 *   <cart-notification> - transient "Added to bag" toast
 *
 * Depends on:
 *   window.routes     - set by layout/theme.liquid
 *   window.theme      - set by assets/global.js (PubSub, events, fetchConfig,
 *                        formatMoney, trapFocus, removeTrapFocus)
 *
 * Publishes canonical events (see window.theme.events):
 *   cart:open, cart:close, cart:update, cart:error
 *
 * The module uses the Shopify Section Rendering API to refresh the drawer
 * and the <cart-icon-bubble> snippet after any mutation.
 * ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const PubSub = theme.PubSub || { publish: function () {}, subscribe: function () {} };
  const events = theme.events || {
    cartOpen: 'cart:open',
    cartClose: 'cart:close',
    cartUpdate: 'cart:update',
    cartError: 'cart:error',
    quickAdd: 'product:quick-add',
  };
  const routes = window.routes || {};

  const SECTION_IDS = {
    cartDrawer: 'cart-drawer',        // used when cart-drawer is its own section (FEAT-008)
    cartIconBubble: 'cart-icon-bubble',
  };

  function fetchJson(url, config) {
    return fetch(url, config).then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, status: response.status, body: body };
      });
    });
  }

  function buildFormPayload(payload) {
    return Object.assign({}, theme.fetchConfig ? theme.fetchConfig('json') : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    }, { body: JSON.stringify(payload) });
  }

  // ---------------------------------------------------------------------------
  // <cart-drawer>
  // ---------------------------------------------------------------------------
  class CartDrawer extends HTMLElement {
    constructor() {
      super();
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onBackdrop = this._onBackdrop.bind(this);
      this.isOpen = false;
      this.openedBy = null;
    }

    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');

      // Wire drawer openers / closers (header cart icon, close buttons).
      this._onOpener = this._onOpener.bind(this);
      this._onCloser = this._onCloser.bind(this);
      document.addEventListener('click', this._onOpener);
      this.addEventListener('click', this._onCloser);

      // Cross-component subscriptions.
      this._subs = [];
      this._subs.push(PubSub.subscribe(events.quickAdd, () => { this.open(); this.refresh(); }));
      this._subs.push(PubSub.subscribe('cart:open', () => this.open()));
      this._subs.push(PubSub.subscribe('cart:close', () => this.close()));
    }

    disconnectedCallback() {
      document.removeEventListener('click', this._onOpener);
      document.removeEventListener('keydown', this._onKeyDown);
      if (this._subs) this._subs.forEach(function (u) { try { u(); } catch (e) {} });
    }

    _onOpener(event) {
      const opener = event.target.closest('[data-cart-open]');
      if (!opener) return;
      event.preventDefault();
      this.open(opener);
    }

    _onCloser(event) {
      const closer = event.target.closest('[data-cart-close]');
      if (!closer) return;
      event.preventDefault();
      this.close();
    }

    _onKeyDown(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        this.close();
      }
    }

    _onBackdrop(event) {
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop && event.target === backdrop) this.close();
    }

    open(trigger) {
      if (this.isOpen) return;
      this.isOpen = true;
      this.openedBy = trigger || document.activeElement;
      this.removeAttribute('hidden');
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overflow-hidden');
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop) {
        backdrop.removeAttribute('hidden');
        backdrop.classList.add('is-active');
        backdrop.addEventListener('click', this._onBackdrop);
      }
      document.addEventListener('keydown', this._onKeyDown);
      if (theme.trapFocus) theme.trapFocus(this);
      PubSub.publish(events.cartOpen, { element: this });
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('hidden', '');
      document.body.classList.remove('overflow-hidden');
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop) {
        backdrop.removeEventListener('click', this._onBackdrop);
        backdrop.classList.remove('is-active');
        backdrop.setAttribute('hidden', '');
      }
      document.removeEventListener('keydown', this._onKeyDown);
      if (theme.removeTrapFocus) theme.removeTrapFocus(this.openedBy);
      this.openedBy = null;
      PubSub.publish(events.cartClose, { element: this });
    }

    // Refresh the drawer content + cart-icon-bubble via Section Rendering.
    refresh() {
      const self = this;
      const urls = [];
      const sectionId = this.getAttribute('data-section-id');
      if (sectionId) {
        urls.push(routes.cart_url + '?section_id=' + encodeURIComponent(sectionId));
      }
      urls.push(routes.cart_url + '?section_id=' + encodeURIComponent(SECTION_IDS.cartIconBubble));

      return fetch(routes.cart_url + '.js')
        .then(function (r) { return r.json(); })
        .then(function (cartState) {
          self._renderSubtotal(cartState);
          self._renderItemCount(cartState);
          self._renderFreeShipping(cartState);
          PubSub.publish(events.cartUpdate, { cart: cartState });
          return cartState;
        })
        .catch(function (err) {
          PubSub.publish(events.cartError, { error: err });
        });
    }

    _renderSubtotal(cart) {
      const subtotal = this.querySelector('[data-cart-subtotal]');
      if (subtotal) {
        subtotal.textContent = theme.formatMoney ? theme.formatMoney(cart.total_price) : ('$' + (cart.total_price / 100).toFixed(2));
      }
    }

    _renderItemCount(cart) {
      const count = cart.item_count || 0;
      // Update header bubbles if present.
      const bubbles = document.querySelectorAll('[data-cart-count-bubble]');
      bubbles.forEach(function (bubble) {
        bubble.setAttribute('data-count', String(count));
        bubble.setAttribute('aria-hidden', count === 0 ? 'true' : 'false');
        const countEl = bubble.querySelector('[data-cart-count]');
        if (countEl) countEl.textContent = String(count);
        if (count === 0) bubble.classList.add('cart-count-bubble--empty');
        else bubble.classList.remove('cart-count-bubble--empty');
      });
      // Update header count text in the drawer title.
      const headerCount = this.querySelector('[data-cart-header-count]');
      if (headerCount) {
        headerCount.textContent = count > 0 ? ('(' + count + ')') : '';
      }
    }

    _renderFreeShipping(cart) {
      const bar = this.querySelector('[data-free-shipping-bar]');
      if (!bar) return;
      const threshold = parseInt(bar.getAttribute('data-threshold'), 10) || 0;
      if (threshold <= 0) return;
      const current = cart.total_price || 0;
      const remaining = Math.max(threshold - current, 0);
      const progress = Math.min(Math.round((current / threshold) * 100), 100);
      bar.setAttribute('data-progress', String(progress));
      const fill = bar.querySelector('[data-free-shipping-fill]');
      if (fill) fill.style.width = progress + '%';
      const track = bar.querySelector('[role="progressbar"]');
      if (track) track.setAttribute('aria-valuenow', String(progress));
      const message = bar.querySelector('[data-free-shipping-message]');
      if (message) {
        if (remaining <= 0) {
          message.textContent = document.documentElement.dataset.i18nShippingReached || 'Congrats! You\u2019ve unlocked free shipping.';
        } else {
          const money = theme.formatMoney ? theme.formatMoney(remaining) : ('$' + (remaining / 100).toFixed(2));
          message.textContent = 'Spend ' + money + ' more for free shipping.';
        }
      }
    }
  }
  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);

  // ---------------------------------------------------------------------------
  // <cart-items>
  // ---------------------------------------------------------------------------
  class CartItems extends HTMLElement {
    constructor() {
      super();
      this._onChange = this._onChange.bind(this);
      this._onRemove = this._onRemove.bind(this);
      this._onNote = this._onNote.bind(this);
    }

    connectedCallback() {
      this.addEventListener('change', this._onChange);
      this.addEventListener('click', this._onRemove);
      this.addEventListener('input', this._onNote);
      this.debouncedNoteSave = theme.debounce ? theme.debounce(this._saveNote.bind(this), 500) : this._saveNote.bind(this);
    }

    disconnectedCallback() {
      this.removeEventListener('change', this._onChange);
      this.removeEventListener('click', this._onRemove);
      this.removeEventListener('input', this._onNote);
    }

    _onChange(event) {
      const input = event.target.closest('[data-cart-line-quantity]');
      if (!input) return;
      const line = parseInt(input.getAttribute('data-line'), 10);
      const quantity = parseInt(input.value, 10) || 0;
      this.updateQuantity(line, quantity, input);
    }

    _onRemove(event) {
      const btn = event.target.closest('[data-cart-remove]');
      if (!btn) return;
      event.preventDefault();
      const line = parseInt(btn.getAttribute('data-line'), 10);
      this.updateQuantity(line, 0, btn);
    }

    _onNote(event) {
      const note = event.target.closest('[data-cart-note]');
      if (!note) return;
      this._pendingNote = note.value;
      this.debouncedNoteSave();
    }

    _saveNote() {
      const payload = { note: this._pendingNote || '' };
      return fetch(routes.cart_update_url, buildFormPayload(payload))
        .then(function (r) { return r.json(); })
        .catch(function () {});
    }

    updateQuantity(line, quantity, trigger) {
      if (!line || isNaN(line)) return;
      this._toggleLoading(trigger, true);

      const sectionIds = [SECTION_IDS.cartIconBubble];
      const drawer = this.closest('cart-drawer');
      if (drawer) {
        const sectionId = drawer.getAttribute('data-section-id');
        if (sectionId) sectionIds.push(sectionId);
      }

      const payload = {
        line: line,
        quantity: quantity,
        sections: sectionIds.join(','),
        sections_url: window.location.pathname,
      };

      return fetchJson(routes.cart_change_url, buildFormPayload(payload)).then((result) => {
        this._toggleLoading(trigger, false);
        if (!result.ok) {
          PubSub.publish(events.cartError, { error: result.body });
          return;
        }
        const cart = result.body;
        // Update sections-rendered markup where applicable.
        if (cart && cart.sections) {
          Object.keys(cart.sections).forEach((sectionId) => {
            this._replaceSectionHtml(sectionId, cart.sections[sectionId]);
          });
        }
        // Refresh drawer counts + subtotal directly from the JSON cart.
        if (drawer && typeof drawer.refresh === 'function') drawer.refresh();
        PubSub.publish(events.cartUpdate, { cart: cart });
      }).catch((err) => {
        this._toggleLoading(trigger, false);
        PubSub.publish(events.cartError, { error: err });
      });
    }

    _replaceSectionHtml(sectionId, html) {
      if (!html) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Re-render the cart-icon-bubble (match by id).
      const newBubble = doc.getElementById('CartCountBubble');
      if (newBubble) {
        const existingBubble = document.getElementById('CartCountBubble');
        if (existingBubble) existingBubble.replaceWith(newBubble);
      }

      // If the section snapshot contains a cart-items region, swap lines.
      const newLines = doc.querySelector('[data-cart-line-items]');
      if (newLines) {
        const current = this.querySelector('[data-cart-line-items]');
        if (current) current.replaceWith(newLines);
      }

      // Swap footer if present.
      const newFooter = doc.querySelector('[data-cart-footer]');
      if (newFooter) {
        const drawer = this.closest('cart-drawer');
        const current = drawer && drawer.querySelector('[data-cart-footer]');
        if (current) current.replaceWith(newFooter);
      }
    }

    _toggleLoading(trigger, loading) {
      if (!trigger) return;
      if (loading) trigger.classList.add('is-loading');
      else trigger.classList.remove('is-loading');
    }
  }
  if (!customElements.get('cart-items')) customElements.define('cart-items', CartItems);

  // ---------------------------------------------------------------------------
  // <cart-notification> - small transient toast on quick-add
  // ---------------------------------------------------------------------------
  class CartNotification extends HTMLElement {
    constructor() {
      super();
      this._timer = null;
    }

    connectedCallback() {
      this._sub = PubSub.subscribe(events.quickAdd, (data) => {
        this.show(data && data.title ? data.title : '');
      });
    }

    disconnectedCallback() {
      if (this._sub) try { this._sub(); } catch (e) {}
    }

    show(title) {
      const body = this.querySelector('[data-cart-notification-body]');
      if (body) body.textContent = title || '';
      this.removeAttribute('hidden');
      this.classList.add('is-visible');
      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        this.classList.remove('is-visible');
        this.setAttribute('hidden', '');
      }, 3200);
    }
  }
  if (!customElements.get('cart-notification')) customElements.define('cart-notification', CartNotification);

  // ---------------------------------------------------------------------------
  // Global add-to-cart helper, consumed by product forms in later features.
  // window.theme.cart.add({ id, quantity, properties })
  // ---------------------------------------------------------------------------
  function addItem(payload) {
    const sectionIds = [SECTION_IDS.cartIconBubble];
    const drawer = document.querySelector('cart-drawer');
    if (drawer) {
      const sectionId = drawer.getAttribute('data-section-id');
      if (sectionId) sectionIds.push(sectionId);
    }
    const body = Object.assign({ sections: sectionIds.join(',') }, payload);
    return fetchJson(routes.cart_add_url, buildFormPayload(body)).then(function (result) {
      if (!result.ok) {
        PubSub.publish(events.cartError, { error: result.body });
        return Promise.reject(result.body);
      }
      PubSub.publish(events.quickAdd, result.body);
      if (drawer && typeof drawer.refresh === 'function') drawer.refresh();
      return result.body;
    });
  }

  window.theme = Object.assign(window.theme || {}, {
    cart: Object.assign({}, (window.theme && window.theme.cart) || {}, {
      add: addItem,
    }),
  });
}());
