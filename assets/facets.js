/* ============================================================================
 * Orlaven | facets.js
 *
 * Custom elements that power the collection + search filtering + sorting UI:
 *   <facet-filters-form> wraps the facets form, auto-submits on change,
 *                        replaces the grid + facets via Section Rendering,
 *                        and updates the URL via history.replaceState.
 *   <price-range>        min/max number inputs that debounce + clamp.
 *   <product-grid>       thin host for the results grid; exposes
 *                        announceResultCount() for aria-live updates.
 *   <collection-toolbar> sort <select>, grid/list toggle, mobile drawer trigger.
 *
 * Depends on:
 *   window.theme.debounce, window.theme.PubSub from assets/global.js
 * ========================================================================== */

(function () {
  'use strict';

  const theme = window.theme || {};
  const debounce = theme.debounce || function (fn) {
    let t;
    return function () {
      const ctx = this;
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, 250);
    };
  };

  // ---------------------------------------------------------------------------
  // <facet-filters-form>
  // ---------------------------------------------------------------------------
  class FacetFiltersForm extends HTMLElement {
    constructor() {
      super();
      this._onChange = this._onChange.bind(this);
      this._onSubmit = this._onSubmit.bind(this);
      this._onRemove = this._onRemove.bind(this);
      this._debouncedSubmit = debounce(this._submit.bind(this), 250);
    }

    connectedCallback() {
      this.sectionId = this.getAttribute('data-section-id');
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.form.addEventListener('change', this._onChange);
      this.form.addEventListener('submit', this._onSubmit);
      this.addEventListener('click', this._onRemove);

      // Mobile drawer open/close
      this._openers = document.querySelectorAll('[data-facets-open]');
      this._openers.forEach((btn) => btn.addEventListener('click', () => this._openDrawer()));
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-facets-close]')) this._closeDrawer();
      });

      // Hook the sort select in the toolbar (lives outside this element).
      this._sortSelect = document.querySelector('[data-sort-select][data-section-id="' + this.sectionId + '"]');
      if (this._sortSelect) {
        this._sortSelect.addEventListener('change', () => {
          const hidden = this.form.querySelector('[data-hidden-sort]');
          if (hidden) hidden.value = this._sortSelect.value;
          else {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'sort_by';
            input.value = this._sortSelect.value;
            input.setAttribute('data-hidden-sort', '');
            this.form.appendChild(input);
          }
          this._submit();
        });
      }
    }

    disconnectedCallback() {
      if (this.form) {
        this.form.removeEventListener('change', this._onChange);
        this.form.removeEventListener('submit', this._onSubmit);
      }
    }

    _onChange() {
      this._debouncedSubmit();
    }

    _onSubmit(e) {
      e.preventDefault();
      this._submit();
    }

    _onRemove(e) {
      const pill = e.target.closest('[data-facet-remove], [data-facet-clear-all]');
      if (!pill) return;
      e.preventDefault();
      this._fetchAndApply(pill.getAttribute('href'));
    }

    _openDrawer() {
      this.classList.add('is-open');
      this.setAttribute('data-open', 'true');
      document.body.classList.add('overflow-hidden');
    }

    _closeDrawer() {
      this.classList.remove('is-open');
      this.removeAttribute('data-open');
      document.body.classList.remove('overflow-hidden');
    }

    _submit() {
      if (!this.form) return;
      const data = new FormData(this.form);
      const params = new URLSearchParams();
      for (const [key, value] of data.entries()) {
        if (value === '' || value == null) continue;
        params.append(key, value);
      }
      const action = this.form.getAttribute('action') || window.location.pathname;
      const url = action + (params.toString() ? '?' + params.toString() : '');
      this._fetchAndApply(url);
    }

    _fetchAndApply(url) {
      if (!url) return;
      const target = document.querySelector('[data-product-grid][data-section-id="' + this.sectionId + '"]');
      if (target) target.setAttribute('aria-busy', 'true');
      this.classList.add('is-loading');

      const sectionUrl = this._withSectionId(url);
      fetch(sectionUrl, { headers: { Accept: 'text/html' } })
        .then((r) => r.text())
        .then((html) => {
          this._applyHtml(html);
          // Update the browser URL to the user-facing one (no section_id).
          try {
            window.history.replaceState({}, '', url);
          } catch (e) {}
        })
        .catch(() => {
          // On error, navigate normally as a fallback.
          window.location.href = url;
        })
        .finally(() => {
          if (target) target.removeAttribute('aria-busy');
          this.classList.remove('is-loading');
        });
    }

    _withSectionId(url) {
      const u = new URL(url, window.location.origin);
      u.searchParams.set('section_id', this.sectionId);
      return u.pathname + '?' + u.searchParams.toString();
    }

    _applyHtml(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Swap the facets form
      const freshFacets = doc.querySelector('facet-filters-form[data-section-id="' + this.sectionId + '"]');
      if (freshFacets) this.replaceWith(freshFacets);

      // Swap the grid
      const gridSelector = '[data-product-grid][data-section-id="' + this.sectionId + '"]';
      const freshGrid = doc.querySelector(gridSelector);
      const liveGrid = document.querySelector(gridSelector);
      if (freshGrid && liveGrid) liveGrid.replaceWith(freshGrid);

      // Swap the result count in the toolbar
      const countSelector = '[data-result-count][data-section-id="' + this.sectionId + '"]';
      const freshCount = doc.querySelector(countSelector);
      const liveCount = document.querySelector(countSelector);
      if (freshCount && liveCount) liveCount.replaceWith(freshCount);

      // aria-live announcement
      const announcer = document.querySelector('[data-facet-announce][data-section-id="' + this.sectionId + '"]');
      if (announcer && freshCount) {
        announcer.textContent = freshCount.textContent.trim();
      }
    }
  }
  if (!customElements.get('facet-filters-form')) {
    customElements.define('facet-filters-form', FacetFiltersForm);
  }

  // ---------------------------------------------------------------------------
  // <price-range>
  // ---------------------------------------------------------------------------
  class PriceRange extends HTMLElement {
    connectedCallback() {
      this.min = this.querySelector('[data-price-min]');
      this.max = this.querySelector('[data-price-max]');
      this._limitMin = Number(this.getAttribute('data-min') || '0');
      this._limitMax = Number(this.getAttribute('data-max') || '0');
      if (this.min) this.min.addEventListener('input', () => this._clamp());
      if (this.max) this.max.addEventListener('input', () => this._clamp());
    }

    _clamp() {
      if (!this.min || !this.max) return;
      const minVal = this.min.value === '' ? this._limitMin : Number(this.min.value);
      const maxVal = this.max.value === '' ? this._limitMax : Number(this.max.value);
      if (this.min.value !== '' && minVal < this._limitMin) this.min.value = String(this._limitMin);
      if (this.max.value !== '' && maxVal > this._limitMax) this.max.value = String(this._limitMax);
      if (this.min.value !== '' && this.max.value !== '' && minVal > maxVal) {
        this.min.value = String(maxVal);
      }
    }
  }
  if (!customElements.get('price-range')) {
    customElements.define('price-range', PriceRange);
  }

  // ---------------------------------------------------------------------------
  // <product-grid>
  // ---------------------------------------------------------------------------
  class ProductGrid extends HTMLElement {
    connectedCallback() {
      // View toggle (grid/list)
      const toggles = document.querySelectorAll('[data-view-toggle][data-section-id="' + this.getAttribute('data-section-id') + '"]');
      toggles.forEach((btn) => {
        btn.addEventListener('click', () => {
          const view = btn.getAttribute('data-view');
          this.setAttribute('data-view', view);
          toggles.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
          try { localStorage.setItem('orlaven.collectionView', view); } catch (e) {}
        });
      });
      try {
        const saved = localStorage.getItem('orlaven.collectionView');
        if (saved) {
          this.setAttribute('data-view', saved);
          toggles.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-view') === saved ? 'true' : 'false'));
        }
      } catch (e) {}
    }
  }
  if (!customElements.get('product-grid')) {
    customElements.define('product-grid', ProductGrid);
  }
}());
