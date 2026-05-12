/* ============================================================================
 * Orlaven | global.js
 *
 * Shared JS runtime for the theme. Vanilla ES, no dependencies, no jQuery.
 *
 * Exposes small helpers on window.theme (PubSub, debounce, throttle,
 * fetchConfig, formatMoney, trapFocus, removeTrapFocus) and registers the
 * following custom elements used by sections and snippets:
 *
 *   <summary-details>  - accessible accordion wrapper around <details>
 *   <deferred-media>   - lazy iframe/video loader
 *   <modal-dialog>     - accessible modal with focus trap and Escape
 *   <sticky-header>    - adds .is-scrolled after scrollY > 80
 *   <quantity-input>   - +/- buttons synced to a number input
 *   <local-tabs>       - ARIA tabs pattern
 *   <scroll-shadow>    - overflow fade indicators for horizontal carousels
 *
 * ========================================================================== */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // PubSub
  // ---------------------------------------------------------------------------
  const PubSub = (function () {
    const subscribers = Object.create(null);

    function subscribe(event, callback) {
      if (typeof callback !== 'function') return function () {};
      if (!subscribers[event]) subscribers[event] = [];
      subscribers[event].push(callback);
      return function unsubscribe() {
        subscribers[event] = (subscribers[event] || []).filter(function (cb) {
          return cb !== callback;
        });
      };
    }

    function publish(event, data) {
      const list = subscribers[event];
      if (!list || !list.length) return;
      for (let i = 0; i < list.length; i += 1) {
        try {
          list[i](data);
        } catch (err) {
          // Isolate subscriber errors.
          // eslint-disable-next-line no-console
          console.error('[PubSub]', event, err);
        }
      }
    }

    return { subscribe, publish };
  }());

  // Public event names consumed across the theme.
  const THEME_EVENTS = Object.freeze({
    cartUpdate: 'cart:update',
    cartError: 'cart:error',
    cartOpen: 'cart:open',
    cartClose: 'cart:close',
    variantChange: 'product:variant-change',
    quickAdd: 'product:quick-add',
    searchOpen: 'search:open',
    searchClose: 'search:close',
  });

  // ---------------------------------------------------------------------------
  // debounce / throttle
  // ---------------------------------------------------------------------------
  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const self = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, wait || 0);
    };
  }

  function throttle(fn, wait) {
    let last = 0;
    let pending = null;
    return function throttled() {
      const args = arguments;
      const self = this;
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(self, args);
      } else if (!pending) {
        pending = setTimeout(function () {
          last = Date.now();
          pending = null;
          fn.apply(self, args);
        }, remaining);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // fetchConfig - headers for Shopify AJAX endpoints
  // ---------------------------------------------------------------------------
  function fetchConfig(type) {
    const accept =
      type === 'javascript' ? 'application/javascript' :
      type === 'html' ? 'text/html' :
      'application/json';
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: accept,
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // formatMoney - minimal Shopify-style money formatter
  // Accepts cents (number) and optional format string like "${{amount}}".
  // Falls back to Intl.NumberFormat when no format string is available.
  // ---------------------------------------------------------------------------
  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = Number(cents) || 0;
    const currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active)
      || window.shopCurrency
      || 'USD';

    if (format && typeof format === 'string') {
      const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = precision == null ? 2 : precision;
        thousands = thousands || ',';
        decimal = decimal || '.';
        if (isNaN(number) || number == null) return 0;
        const n = (number / 100.0).toFixed(precision);
        const parts = n.split('.');
        const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
        const cents = parts[1] ? decimal + parts[1] : '';
        return dollars + cents;
      }
      let formatted = format;
      switch (format.match(placeholderRegex) && format.match(placeholderRegex)[1]) {
        case 'amount':
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 2));
          break;
        case 'amount_no_decimals':
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 0));
          break;
        case 'amount_with_comma_separator':
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 2, '.', ','));
          break;
        case 'amount_no_decimals_with_comma_separator':
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 0, '.', ','));
          break;
        case 'amount_with_space_separator':
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 2, ' ', '.'));
          break;
        default:
          formatted = format.replace(placeholderRegex, formatWithDelimiters(value, 2));
      }
      return formatted;
    }

    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: currency,
      }).format(value / 100);
    } catch (err) {
      return '$' + (value / 100).toFixed(2);
    }
  }

  // ---------------------------------------------------------------------------
  // Focus trap
  //
  // Stack-based: multiple concurrent traps (e.g. cart drawer + mobile drawer)
  // layer on top of each other without stripping the previous one. Only one
  // keydown listener is active at a time (the top of the stack); lower
  // entries are "suspended" and resume automatically when the top is popped.
  //
  // Single-drawer callers see the same behavior as before: trapFocus(c) /
  // removeTrapFocus(opener).
  // ---------------------------------------------------------------------------
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
    'summary',
  ].join(',');

  const _focusTrapStack = [];

  function _installTrap(entry) {
    document.addEventListener('keydown', entry.keyHandler);
    entry.active = true;
  }

  function _uninstallTrap(entry) {
    document.removeEventListener('keydown', entry.keyHandler);
    entry.active = false;
  }

  function getFocusable(container) {
    const nodes = container.querySelectorAll(focusableSelectors);
    const list = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      if (!el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')) {
        if (el.offsetParent !== null || el === document.activeElement) list.push(el);
      }
    }
    return list;
  }

  function trapFocus(container, elementToFocus) {
    if (!container) return;

    // If the same container is already trapped at the top of the stack,
    // this is a no-op re-entry (defensive against double-open calls).
    const top = _focusTrapStack[_focusTrapStack.length - 1];
    if (top && top.container === container) {
      const target = elementToFocus || getFocusable(container)[0] || container;
      if (target && typeof target.focus === 'function') {
        window.requestAnimationFrame(function () { target.focus(); });
      }
      return;
    }

    // Suspend the previous top so only one keydown handler is active.
    if (top && top.active) _uninstallTrap(top);

    const first = getFocusable(container)[0];
    const target = elementToFocus || first || container;

    function keyHandler(event) {
      if (event.key !== 'Tab' && event.keyCode !== 9) return;
      const items = getFocusable(container);
      if (!items.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === firstEl || document.activeElement === container) {
          event.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    const entry = { container, keyHandler, active: false };
    _focusTrapStack.push(entry);
    _installTrap(entry);

    if (target && typeof target.focus === 'function') {
      window.requestAnimationFrame(function () { target.focus(); });
    }
  }

  function removeTrapFocus(elementToFocus) {
    // Pop the top entry if any.
    const entry = _focusTrapStack.pop();
    if (entry && entry.active) _uninstallTrap(entry);
    // Resume the new top so the underlying drawer keeps its trap.
    const next = _focusTrapStack[_focusTrapStack.length - 1];
    if (next && !next.active) _installTrap(next);
    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      elementToFocus.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Shared drawer chrome
  //
  // Reference-counted helpers for the body scroll-lock class and the single
  // [data-drawer-backdrop] element. Multiple drawers (cart, mobile nav,
  // predictive search) can be open concurrently below 1024px; closing one
  // must not release state the others still need.
  //
  // Callers should push on open and pop on close. Direct-touch fallbacks
  // in the drawer modules keep the pre-helper behavior when this file has
  // not loaded yet.
  // ---------------------------------------------------------------------------
  let _scrollLockDepth = 0;
  let _backdropDepth = 0;

  function pushScrollLock() {
    _scrollLockDepth += 1;
    if (_scrollLockDepth === 1) document.body.classList.add('overflow-hidden');
  }

  function popScrollLock() {
    _scrollLockDepth = Math.max(0, _scrollLockDepth - 1);
    if (_scrollLockDepth === 0) document.body.classList.remove('overflow-hidden');
  }

  function pushBackdrop() {
    _backdropDepth += 1;
    const bd = document.querySelector('[data-drawer-backdrop]');
    if (bd && _backdropDepth === 1) {
      bd.removeAttribute('hidden');
      bd.classList.add('is-active');
    }
  }

  function popBackdrop() {
    _backdropDepth = Math.max(0, _backdropDepth - 1);
    const bd = document.querySelector('[data-drawer-backdrop]');
    if (bd && _backdropDepth === 0) {
      bd.classList.remove('is-active');
      bd.setAttribute('hidden', '');
    }
  }

  // ---------------------------------------------------------------------------
  // Lazy image fade-in via IntersectionObserver
  // ---------------------------------------------------------------------------
  function initLazyImages(root) {
    const scope = root || document;
    const images = scope.querySelectorAll('img[loading="lazy"]:not(.is-loaded)');
    if (!images.length) return;

    function markLoaded(img) {
      img.classList.add('is-loaded');
      img.classList.add('loaded');
    }

    if (!('IntersectionObserver' in window)) {
      images.forEach(markLoaded);
      return;
    }

    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        if (img.complete && img.naturalWidth > 0) {
          markLoaded(img);
        } else {
          img.addEventListener('load', function onLoad() {
            markLoaded(img);
            img.removeEventListener('load', onLoad);
          });
          img.addEventListener('error', function onErr() {
            markLoaded(img);
            img.removeEventListener('error', onErr);
          });
        }
        obs.unobserve(img);
      });
    }, { rootMargin: '200px 0px' });

    images.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        markLoaded(img);
      } else {
        observer.observe(img);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // <summary-details> - progressive enhancement over <details>
  // ---------------------------------------------------------------------------
  class SummaryDetails extends HTMLElement {
    constructor() {
      super();
      this._onToggle = this._onToggle.bind(this);
    }

    connectedCallback() {
      const details = this.querySelectorAll('details');
      details.forEach((detail) => {
        const summary = detail.querySelector('summary');
        if (!summary) return;
        if (!summary.hasAttribute('role')) summary.setAttribute('role', 'button');
        if (!summary.hasAttribute('aria-expanded')) {
          summary.setAttribute('aria-expanded', detail.open ? 'true' : 'false');
        }
        detail.addEventListener('toggle', this._onToggle);
      });
    }

    disconnectedCallback() {
      this.querySelectorAll('details').forEach((detail) => {
        detail.removeEventListener('toggle', this._onToggle);
      });
    }

    _onToggle(event) {
      const detail = event.currentTarget;
      const summary = detail.querySelector('summary');
      if (summary) summary.setAttribute('aria-expanded', detail.open ? 'true' : 'false');
    }
  }
  if (!customElements.get('summary-details')) {
    customElements.define('summary-details', SummaryDetails);
  }

  // ---------------------------------------------------------------------------
  // <deferred-media> - replaces poster with real iframe/video on interaction
  // Usage:
  //   <deferred-media data-media-src="https://www.youtube.com/embed/XYZ">
  //     <button type="button" class="deferred-media__poster">...</button>
  //     <template>
  //       <iframe src="https://www.youtube.com/embed/XYZ?autoplay=1"
  //               allowfullscreen loading="lazy"></iframe>
  //     </template>
  //   </deferred-media>
  // ---------------------------------------------------------------------------
  class DeferredMedia extends HTMLElement {
    constructor() {
      super();
      this._onActivate = this._onActivate.bind(this);
    }

    connectedCallback() {
      const trigger = this.querySelector(
        '[data-deferred-media-trigger], .deferred-media__poster, button'
      );
      if (trigger) trigger.addEventListener('click', this._onActivate);
    }

    _onActivate(event) {
      event.preventDefault();
      if (this.getAttribute('loaded') === 'true') return;
      const template = this.querySelector('template');
      if (!template) return;
      const clone = template.content.firstElementChild
        ? template.content.firstElementChild.cloneNode(true)
        : template.content.cloneNode(true);
      const poster = this.querySelector('.deferred-media__poster, [data-deferred-media-trigger]');
      if (poster) poster.remove();
      this.appendChild(clone);
      this.setAttribute('loaded', 'true');
      const autofocus = this.querySelector('iframe, video');
      if (autofocus && typeof autofocus.focus === 'function') autofocus.focus({ preventScroll: true });
    }
  }
  if (!customElements.get('deferred-media')) {
    customElements.define('deferred-media', DeferredMedia);
  }

  // ---------------------------------------------------------------------------
  // <modal-dialog> - accessible modal with focus trap + Escape to close
  // Usage:
  //   <modal-dialog id="size-guide">
  //     <div role="dialog" aria-modal="true" aria-labelledby="...">...</div>
  //   </modal-dialog>
  //   Buttons: [data-modal-open="size-guide"], [data-modal-close]
  // ---------------------------------------------------------------------------
  class ModalDialog extends HTMLElement {
    constructor() {
      super();
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onBackdrop = this._onBackdrop.bind(this);
      this.isOpen = false;
      this.openedBy = null;
    }

    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      const closers = this.querySelectorAll('[data-modal-close]');
      closers.forEach((btn) => btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      }));
      this.addEventListener('click', this._onBackdrop);
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._onKeyDown);
    }

    open(trigger) {
      if (this.isOpen) return;
      this.isOpen = true;
      this.openedBy = trigger || document.activeElement;
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      pushScrollLock();
      document.addEventListener('keydown', this._onKeyDown);
      trapFocus(this);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      popScrollLock();
      document.removeEventListener('keydown', this._onKeyDown);
      removeTrapFocus(this.openedBy);
      this.openedBy = null;
    }

    _onKeyDown(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        this.close();
      }
    }

    _onBackdrop(event) {
      if (event.target === this) this.close();
    }
  }
  if (!customElements.get('modal-dialog')) {
    customElements.define('modal-dialog', ModalDialog);
  }

  // Delegated openers
  document.addEventListener('click', function (event) {
    const opener = event.target.closest('[data-modal-open]');
    if (!opener) return;
    const id = opener.getAttribute('data-modal-open');
    const modal = document.getElementById(id);
    if (modal && typeof modal.open === 'function') {
      event.preventDefault();
      modal.open(opener);
    }
  });

  // ---------------------------------------------------------------------------
  // <sticky-header> - adds .is-scrolled after 80px of scroll
  // ---------------------------------------------------------------------------
  class StickyHeader extends HTMLElement {
    constructor() {
      super();
      this._onScroll = throttle(this._update.bind(this), 100);
    }

    connectedCallback() {
      this.threshold = parseInt(this.getAttribute('data-scroll-threshold') || '80', 10);
      this._update();
      window.addEventListener('scroll', this._onScroll, { passive: true });
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this._onScroll);
    }

    _update() {
      const y = window.scrollY || window.pageYOffset || 0;
      if (y > this.threshold) {
        this.classList.add('is-scrolled');
      } else {
        this.classList.remove('is-scrolled');
      }
    }
  }
  if (!customElements.get('sticky-header')) {
    customElements.define('sticky-header', StickyHeader);
  }

  // ---------------------------------------------------------------------------
  // <quantity-input> - +/- syncs with an <input type="number">
  // ---------------------------------------------------------------------------
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this._onClick = this._onClick.bind(this);
      this._onChange = this._onChange.bind(this);
    }

    connectedCallback() {
      this.input = this.querySelector('input[type="number"]');
      if (!this.input) return;
      this.decreaseButton = this.querySelector('button[name="minus"], [data-qty-decrease]');
      this.increaseButton = this.querySelector('button[name="plus"], [data-qty-increase]');
      if (this.decreaseButton) this.decreaseButton.addEventListener('click', this._onClick);
      if (this.increaseButton) this.increaseButton.addEventListener('click', this._onClick);
      this.input.addEventListener('change', this._onChange);
      this._refresh();
    }

    disconnectedCallback() {
      if (this.decreaseButton) this.decreaseButton.removeEventListener('click', this._onClick);
      if (this.increaseButton) this.increaseButton.removeEventListener('click', this._onClick);
      if (this.input) this.input.removeEventListener('change', this._onChange);
    }

    _onClick(event) {
      event.preventDefault();
      const direction = event.currentTarget === this.decreaseButton ? -1 : 1;
      const step = parseInt(this.input.step || '1', 10) || 1;
      const min = parseInt(this.input.min || '1', 10);
      const max = this.input.max ? parseInt(this.input.max, 10) : Infinity;
      const current = parseInt(this.input.value || min || 0, 10) || 0;
      const next = Math.min(Math.max(current + direction * step, min), max);
      if (next === current) return;
      this.input.value = String(next);
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    _onChange() {
      this._refresh();
    }

    _refresh() {
      if (!this.input) return;
      const min = parseInt(this.input.min || '1', 10);
      const max = this.input.max ? parseInt(this.input.max, 10) : Infinity;
      const current = parseInt(this.input.value || min || 0, 10) || 0;
      if (this.decreaseButton) this.decreaseButton.disabled = current <= min;
      if (this.increaseButton) this.increaseButton.disabled = current >= max;
    }
  }
  if (!customElements.get('quantity-input')) {
    customElements.define('quantity-input', QuantityInput);
  }

  // ---------------------------------------------------------------------------
  // <local-tabs> - ARIA tabs pattern
  // Expects:
  //   <local-tabs>
  //     <div role="tablist">
  //       <button role="tab" aria-controls="p1" id="t1">...</button>
  //     </div>
  //     <div id="p1" role="tabpanel" aria-labelledby="t1">...</div>
  //   </local-tabs>
  // ---------------------------------------------------------------------------
  class LocalTabs extends HTMLElement {
    constructor() {
      super();
      this._onClick = this._onClick.bind(this);
      this._onKey = this._onKey.bind(this);
    }

    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      if (!this.tabs.length) return;
      this.tabs.forEach((tab, i) => {
        tab.setAttribute('tabindex', tab.getAttribute('aria-selected') === 'true' ? '0' : '-1');
        tab.addEventListener('click', this._onClick);
        tab.addEventListener('keydown', this._onKey);
        if (i === 0 && !this.tabs.some((t) => t.getAttribute('aria-selected') === 'true')) {
          this._activate(tab);
        }
      });
      this.panels.forEach((panel) => {
        const controllingTab = this.tabs.find((t) => t.getAttribute('aria-controls') === panel.id);
        if (!controllingTab || controllingTab.getAttribute('aria-selected') !== 'true') {
          panel.hidden = true;
        }
      });
    }

    _onClick(event) {
      event.preventDefault();
      this._activate(event.currentTarget);
    }

    _onKey(event) {
      const idx = this.tabs.indexOf(event.currentTarget);
      if (idx === -1) return;
      let next = idx;
      if (event.key === 'ArrowRight') next = (idx + 1) % this.tabs.length;
      else if (event.key === 'ArrowLeft') next = (idx - 1 + this.tabs.length) % this.tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = this.tabs.length - 1;
      else return;
      event.preventDefault();
      const target = this.tabs[next];
      this._activate(target);
      target.focus();
    }

    _activate(tab) {
      this.tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute('aria-selected', selected ? 'true' : 'false');
        t.setAttribute('tabindex', selected ? '0' : '-1');
      });
      const controls = tab.getAttribute('aria-controls');
      this.panels.forEach((panel) => {
        panel.hidden = panel.id !== controls;
      });
    }
  }
  if (!customElements.get('local-tabs')) {
    customElements.define('local-tabs', LocalTabs);
  }

  // ---------------------------------------------------------------------------
  // <scroll-shadow> - adds data-overflow-left / data-overflow-right
  // to show a fade edge on horizontal carousels.
  // ---------------------------------------------------------------------------
  class ScrollShadow extends HTMLElement {
    constructor() {
      super();
      this._update = throttle(this._updateInner.bind(this), 80);
    }

    connectedCallback() {
      this.scroller = this.querySelector('[data-scroll-shadow-scroller]') || this.firstElementChild;
      if (!this.scroller) return;
      this.scroller.addEventListener('scroll', this._update, { passive: true });
      window.addEventListener('resize', this._update);
      this._updateInner();
    }

    disconnectedCallback() {
      if (this.scroller) this.scroller.removeEventListener('scroll', this._update);
      window.removeEventListener('resize', this._update);
    }

    _updateInner() {
      if (!this.scroller) return;
      const { scrollLeft, scrollWidth, clientWidth } = this.scroller;
      if (scrollLeft > 2) this.setAttribute('data-overflow-left', '');
      else this.removeAttribute('data-overflow-left');
      if (scrollLeft + clientWidth < scrollWidth - 2) this.setAttribute('data-overflow-right', '');
      else this.removeAttribute('data-overflow-right');
    }
  }
  if (!customElements.get('scroll-shadow')) {
    customElements.define('scroll-shadow', ScrollShadow);
  }

  // ---------------------------------------------------------------------------
  // Skip-to-content focus handling
  // ---------------------------------------------------------------------------
  document.addEventListener('click', function (event) {
    const link = event.target.closest('.skip-to-content-link');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: false });
  });

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  function onReady() {
    initLazyImages(document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  // ---------------------------------------------------------------------------
  // Public exports
  // ---------------------------------------------------------------------------
  window.theme = Object.assign(window.theme || {}, {
    PubSub,
    events: THEME_EVENTS,
    debounce,
    throttle,
    fetchConfig,
    formatMoney,
    trapFocus,
    removeTrapFocus,
    pushScrollLock,
    popScrollLock,
    pushBackdrop,
    popBackdrop,
    initLazyImages,
  });
}());
