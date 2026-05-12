/* ============================================================================
 * Orlaven | predictive-search.js
 *
 * Defines the <predictive-search> custom element used by
 * snippets/predictive-search.liquid. Fetches from /search/suggest.json
 * with resource types product, collection, page and article (debounced
 * 200ms). Results render grouped, and the keyboard pattern follows the
 * combobox-with-listbox WAI-ARIA spec.
 *
 * Events (window.theme.events):
 *   search:open, search:close
 * ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const PubSub = theme.PubSub || { publish: function () {}, subscribe: function () {} };
  const events = theme.events || { searchOpen: 'search:open', searchClose: 'search:close' };
  const routes = window.routes || {};
  const PREDICTIVE_URL = routes.predictive_search_url || '/search/suggest.json';

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return c;
      }
    });
  }

  function formatMoney(cents) {
    if (theme.formatMoney) return theme.formatMoney(cents);
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this._isOpen = false;
      this._activeIndex = -1;
      this._items = [];
      this._onOpener = this._onOpener.bind(this);
      this._onCloser = this._onCloser.bind(this);
      this._onInput = this._onInput.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onGlobalKey = this._onGlobalKey.bind(this);
      this._onBackdrop = this._onBackdrop.bind(this);
      this._onSuggestion = this._onSuggestion.bind(this);
      this._onReset = this._onReset.bind(this);
    }

    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      this.input = this.querySelector('[data-predictive-search-input]');
      this.form = this.querySelector('[data-predictive-search-form]');
      this.resultsWrap = this.querySelector('[data-predictive-search-results]');
      this.suggestionsWrap = this.querySelector('[data-predictive-search-suggestions]');
      this.loadingEl = this.querySelector('[data-predictive-search-loading]');
      this.emptyEl = this.querySelector('[data-predictive-search-empty]');
      this.announcer = this.querySelector('[data-predictive-search-announcer]');
      this.viewAll = this.querySelector('[data-predictive-search-view-all]');
      this.resetBtn = this.querySelector('[data-predictive-search-reset]');

      this.limit = parseInt(this.getAttribute('data-search-limit'), 10) || 6;
      this.debouncedFetch = theme.debounce
        ? theme.debounce(this._fetchResults.bind(this), 200)
        : this._fetchResults.bind(this);

      document.addEventListener('click', this._onOpener);
      this.addEventListener('click', this._onCloser);
      if (this.input) {
        this.input.addEventListener('input', this._onInput);
        this.input.addEventListener('keydown', this._onKeyDown);
      }
      if (this.resetBtn) this.resetBtn.addEventListener('click', this._onReset);

      const suggestions = this.querySelectorAll('[data-predictive-search-suggestion]');
      suggestions.forEach((btn) => btn.addEventListener('click', this._onSuggestion));
    }

    disconnectedCallback() {
      document.removeEventListener('click', this._onOpener);
      document.removeEventListener('keydown', this._onGlobalKey);
    }

    _onOpener(event) {
      const opener = event.target.closest('[data-search-open]');
      if (!opener) return;
      event.preventDefault();
      this.open(opener);
    }

    _onCloser(event) {
      const closer = event.target.closest('[data-search-close]');
      if (!closer) return;
      event.preventDefault();
      this.close();
    }

    _onBackdrop(event) {
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop && event.target === backdrop) this.close();
    }

    open(trigger) {
      if (this._isOpen) return;
      this._isOpen = true;
      this.openedBy = trigger || document.activeElement;
      this.removeAttribute('hidden');
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      if (typeof theme.pushScrollLock === 'function') {
        theme.pushScrollLock();
      } else {
        document.body.classList.add('overflow-hidden');
      }
      if (typeof theme.pushBackdrop === 'function') {
        theme.pushBackdrop();
      } else {
        const bd = document.querySelector('[data-drawer-backdrop]');
        if (bd) { bd.removeAttribute('hidden'); bd.classList.add('is-active'); }
      }
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop) backdrop.addEventListener('click', this._onBackdrop);
      document.addEventListener('keydown', this._onGlobalKey);
      if (theme.trapFocus) theme.trapFocus(this, this.input);
      else if (this.input) window.requestAnimationFrame(() => this.input.focus());
      PubSub.publish(events.searchOpen, { element: this });
    }

    close() {
      if (!this._isOpen) return;
      this._isOpen = false;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('hidden', '');
      const backdrop = document.querySelector('[data-drawer-backdrop]');
      if (backdrop) backdrop.removeEventListener('click', this._onBackdrop);
      if (typeof theme.popScrollLock === 'function') {
        theme.popScrollLock();
      } else {
        document.body.classList.remove('overflow-hidden');
      }
      if (typeof theme.popBackdrop === 'function') {
        theme.popBackdrop();
      } else if (backdrop) {
        backdrop.classList.remove('is-active');
        backdrop.setAttribute('hidden', '');
      }
      document.removeEventListener('keydown', this._onGlobalKey);
      if (theme.removeTrapFocus) theme.removeTrapFocus(this.openedBy);
      this.openedBy = null;
      PubSub.publish(events.searchClose, { element: this });
    }

    _onGlobalKey(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        this.close();
      }
    }

    _onInput(event) {
      const value = (event.target.value || '').trim();
      if (this.resetBtn) {
        if (value.length > 0) this.resetBtn.removeAttribute('hidden');
        else this.resetBtn.setAttribute('hidden', '');
      }
      if (this.input) this.input.setAttribute('aria-expanded', value.length > 1 ? 'true' : 'false');
      if (value.length < 2) {
        this._clearResults();
        return;
      }
      this._showLoading();
      this.debouncedFetch(value);
    }

    _onReset() {
      if (!this.input) return;
      this.input.value = '';
      this._clearResults();
      this.input.focus();
      if (this.resetBtn) this.resetBtn.setAttribute('hidden', '');
    }

    _onSuggestion(event) {
      const text = event.currentTarget.textContent.trim();
      if (!this.input) return;
      this.input.value = text;
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.focus();
    }

    _showLoading() {
      if (this.loadingEl) this.loadingEl.removeAttribute('hidden');
      if (this.emptyEl) this.emptyEl.setAttribute('hidden', '');
    }

    _hideLoading() {
      if (this.loadingEl) this.loadingEl.setAttribute('hidden', '');
    }

    _clearResults() {
      this._items = [];
      this._activeIndex = -1;
      if (this.resultsWrap) this.resultsWrap.setAttribute('hidden', '');
      if (this.suggestionsWrap) this.suggestionsWrap.removeAttribute('hidden');
      if (this.emptyEl) this.emptyEl.setAttribute('hidden', '');
      if (this.viewAll) this.viewAll.setAttribute('hidden', '');
      this.querySelectorAll('[data-predictive-search-group]').forEach((g) => g.setAttribute('hidden', ''));
      this._hideLoading();
    }

    _fetchResults(query) {
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('resources[type]', 'product,collection,page,article');
      params.set('resources[limit]', String(this.limit));
      params.set('resources[options][unavailable_products]', 'last');
      params.set('resources[options][fields]', 'title,vendor,product_type,tag');

      const url = PREDICTIVE_URL + '?' + params.toString() + '&section_id=predictive-search';

      fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
        .then((response) => {
          if (!response.ok) throw new Error('search-failed');
          return response.json().catch(() => null).then((json) => {
            if (json && json.resources) return json;
            // Shopify returns HTML when section_id is provided. Fall back to
            // a second fetch that requests the plain JSON endpoint.
            return fetch(PREDICTIVE_URL + '?' + params.toString(), {
              headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            }).then((r) => r.json());
          });
        })
        .then((data) => {
          this._hideLoading();
          this._renderResults(query, data);
        })
        .catch((err) => {
          this._hideLoading();
          if (this.emptyEl) {
            this.emptyEl.textContent = 'Search is unavailable. Please try again.';
            this.emptyEl.removeAttribute('hidden');
          }
          PubSub.publish('search:error', { error: err });
        });
    }

    _renderResults(query, data) {
      const resources = (data && data.resources && data.resources.results) || {};
      const products = resources.products || [];
      const collections = resources.collections || [];
      const pages = resources.pages || [];
      const articles = resources.articles || [];

      const total = products.length + collections.length + pages.length + articles.length;

      if (this.suggestionsWrap) this.suggestionsWrap.setAttribute('hidden', '');
      if (total === 0) {
        if (this.resultsWrap) this.resultsWrap.setAttribute('hidden', '');
        if (this.emptyEl) {
          this.emptyEl.textContent = 'No results for \u201C' + query + '\u201D.';
          this.emptyEl.removeAttribute('hidden');
        }
        if (this.announcer) this.announcer.textContent = 'No results';
        this._items = [];
        this._activeIndex = -1;
        if (this.viewAll) this.viewAll.setAttribute('hidden', '');
        return;
      }

      if (this.resultsWrap) this.resultsWrap.removeAttribute('hidden');
      if (this.emptyEl) this.emptyEl.setAttribute('hidden', '');
      if (this.viewAll) {
        this.viewAll.removeAttribute('hidden');
        this.viewAll.setAttribute('href', (routes.search_url || '/search') + '?q=' + encodeURIComponent(query));
      }

      this._renderProducts(products);
      this._renderSimpleList('collections', collections);
      this._renderSimpleList('pages', pages);
      this._renderSimpleList('articles', articles);

      // Build a flat list of focusable items for arrow-key navigation.
      this._items = Array.from(this.querySelectorAll('[data-predictive-search-item]'));
      this._activeIndex = -1;

      if (this.announcer) {
        this.announcer.textContent = total + ' result' + (total === 1 ? '' : 's') + ' available';
      }
    }

    _renderProducts(products) {
      const group = this.querySelector('[data-predictive-search-group="products"]');
      const list = this.querySelector('[data-predictive-search-list="products"]');
      if (!group || !list) return;
      if (!products.length) { group.setAttribute('hidden', ''); list.innerHTML = ''; return; }
      group.removeAttribute('hidden');
      list.innerHTML = products.map(function (p) {
        const image = p.featured_image && (p.featured_image.url || p.featured_image);
        // /search/suggest.json returns `price` as a string in major units
        // ("595.00") and `price_min` is also major units. Convert to cents
        // once - no double-round. Prefer price_min when available because
        // variant-priced products expose it first.
        let priceCents = null;
        if (p.price_min != null && p.price_min !== '') {
          priceCents = Math.round(Number(p.price_min) * 100);
        } else if (p.price != null && p.price !== '') {
          priceCents = Math.round(Number(p.price) * 100);
        } else if (p.compare_at_price_min != null && p.compare_at_price_min !== '') {
          priceCents = Math.round(Number(p.compare_at_price_min) * 100);
        }
        const price = priceCents != null && !Number.isNaN(priceCents) ? formatMoney(priceCents) : '';
        return (
          '<li class="predictive-search__result predictive-search__result--product" role="option" data-predictive-search-item>' +
            '<a href="' + escapeHtml(p.url) + '">' +
              (image ? '<span class="predictive-search__result-media"><img src="' + escapeHtml(image) + '" alt="" loading="lazy" width="60" height="72"></span>' : '') +
              '<span class="predictive-search__result-body">' +
                '<span class="predictive-search__result-title">' + escapeHtml(p.title) + '</span>' +
                (p.vendor ? '<span class="predictive-search__result-meta">' + escapeHtml(p.vendor) + '</span>' : '') +
                (price ? '<span class="predictive-search__result-price">' + escapeHtml(price) + '</span>' : '') +
              '</span>' +
            '</a>' +
          '</li>'
        );
      }).join('');
    }

    _renderSimpleList(type, items) {
      const group = this.querySelector('[data-predictive-search-group="' + type + '"]');
      const list = this.querySelector('[data-predictive-search-list="' + type + '"]');
      if (!group || !list) return;
      if (!items.length) { group.setAttribute('hidden', ''); list.innerHTML = ''; return; }
      group.removeAttribute('hidden');
      list.innerHTML = items.map(function (it) {
        return (
          '<li class="predictive-search__result" role="option" data-predictive-search-item>' +
            '<a href="' + escapeHtml(it.url) + '">' +
              '<span class="predictive-search__result-title">' + escapeHtml(it.title) + '</span>' +
            '</a>' +
          '</li>'
        );
      }).join('');
    }

    _onKeyDown(event) {
      const key = event.key;
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== 'Home' && key !== 'End') {
        return;
      }
      if (!this._items || this._items.length === 0) return;

      if (key === 'Enter') {
        if (this._activeIndex >= 0 && this._items[this._activeIndex]) {
          event.preventDefault();
          const link = this._items[this._activeIndex].querySelector('a');
          if (link) link.click();
        }
        return;
      }

      event.preventDefault();
      const last = this._items.length - 1;
      if (key === 'ArrowDown') this._activeIndex = this._activeIndex >= last ? 0 : this._activeIndex + 1;
      else if (key === 'ArrowUp') this._activeIndex = this._activeIndex <= 0 ? last : this._activeIndex - 1;
      else if (key === 'Home') this._activeIndex = 0;
      else if (key === 'End') this._activeIndex = last;
      this._highlight();
    }

    _highlight() {
      this._items.forEach((item, idx) => {
        if (idx === this._activeIndex) {
          item.setAttribute('aria-selected', 'true');
          item.scrollIntoView({ block: 'nearest' });
          const id = 'predictive-active-' + idx;
          item.id = id;
          if (this.input) this.input.setAttribute('aria-activedescendant', id);
        } else {
          item.removeAttribute('aria-selected');
        }
      });
    }
  }

  if (!customElements.get('predictive-search')) {
    customElements.define('predictive-search', PredictiveSearch);
  }
}());
