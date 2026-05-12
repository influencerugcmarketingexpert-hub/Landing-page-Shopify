/* ============================================================================
 * Orlaven | header.js
 *
 * Header runtime. Wires up the interactive pieces that were left without
 * handlers in the initial build:
 *
 *   - Mobile off-canvas menu (open/close, focus trap, Escape, backdrop)
 *   - Desktop mega menu triggers (hover/focus open, outside-click close,
 *     Escape close)
 *   - Mobile submenu disclosure triggers (aria-expanded toggle)
 *   - Localization country/language forms (auto-submit on select change)
 *
 * Defensive by design: if any of the expected markers are absent from the
 * DOM (e.g. the store doesn't enable Markets, or the header was simplified
 * in the theme editor), the corresponding branch silently no-ops.
 *
 * Depends on:
 *   window.theme.trapFocus / window.theme.removeTrapFocus
 *     (defined in assets/global.js; falls back to a no-op if missing).
 * ========================================================================== */

(function () {
  'use strict';

  var theme = window.theme || {};
  var trapFocus = typeof theme.trapFocus === 'function' ? theme.trapFocus : function () {};
  var removeTrapFocus = typeof theme.removeTrapFocus === 'function' ? theme.removeTrapFocus : function () {};

  // Ref-counted body scroll-lock and shared backdrop helpers. Fall back to
  // direct DOM mutation when global.js hasn't loaded yet (defensive - the
  // helpers replace the raw body.classList / backdrop touches that would
  // otherwise race between the mobile menu and cart drawer).
  function lockBody() {
    if (typeof theme.pushScrollLock === 'function') theme.pushScrollLock();
    else document.body.classList.add('overflow-hidden');
  }
  function unlockBody() {
    if (typeof theme.popScrollLock === 'function') theme.popScrollLock();
    else document.body.classList.remove('overflow-hidden');
  }
  function showBackdrop() {
    if (typeof theme.pushBackdrop === 'function') { theme.pushBackdrop(); return; }
    var bd = document.querySelector('[data-drawer-backdrop]');
    if (bd) { bd.removeAttribute('hidden'); bd.classList.add('is-active'); }
  }
  function hideBackdrop() {
    if (typeof theme.popBackdrop === 'function') { theme.popBackdrop(); return; }
    var bd = document.querySelector('[data-drawer-backdrop]');
    if (bd) { bd.classList.remove('is-active'); bd.setAttribute('hidden', ''); }
  }

  var DESKTOP_BREAKPOINT = 1024;

  function isDesktop() {
    return window.matchMedia && window.matchMedia('(min-width: ' + DESKTOP_BREAKPOINT + 'px)').matches;
  }

  // ---------------------------------------------------------------------------
  // Mobile drawer
  // ---------------------------------------------------------------------------
  function initMobileDrawer() {
    var drawer = document.querySelector('[data-mobile-menu]');
    if (!drawer) return;

    var backdrop = document.querySelector('[data-drawer-backdrop]');
    var openers = document.querySelectorAll('[data-mobile-menu-open]');
    var closers = drawer.querySelectorAll('[data-mobile-menu-close]');
    var lastOpener = null;

    function open(trigger) {
      lastOpener = trigger || document.activeElement;
      drawer.removeAttribute('hidden');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      lockBody();
      showBackdrop();
      if (backdrop) backdrop.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      openers.forEach(function (el) { el.setAttribute('aria-expanded', 'true'); });
      trapFocus(drawer);
    }

    function close() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('hidden', '');
      if (backdrop) backdrop.removeEventListener('click', onBackdrop);
      unlockBody();
      hideBackdrop();
      document.removeEventListener('keydown', onKey);
      openers.forEach(function (el) { el.setAttribute('aria-expanded', 'false'); });
      removeTrapFocus(lastOpener);
      lastOpener = null;
    }

    function onBackdrop(event) {
      if (event.target === backdrop) close();
    }

    function onKey(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        close();
      }
    }

    openers.forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        open(btn);
      });
    });
    closers.forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        close();
      });
    });

    // Auto-close when crossing into desktop layout.
    var mq = window.matchMedia && window.matchMedia('(min-width: ' + DESKTOP_BREAKPOINT + 'px)');
    if (mq) {
      var onChange = function () {
        if (mq.matches && drawer.classList.contains('is-open')) close();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    }
  }

  // ---------------------------------------------------------------------------
  // Desktop mega menus
  // ---------------------------------------------------------------------------
  function initMegaMenus() {
    var triggers = document.querySelectorAll('[data-mega-menu-trigger]');
    if (!triggers.length) return;

    var panels = document.querySelectorAll('[data-mega-menu]');
    if (!panels.length) return;

    var openTimer = null;
    var closeTimer = null;
    var currentHandle = null;

    function panelFor(handle) {
      for (var i = 0; i < panels.length; i += 1) {
        if (panels[i].getAttribute('data-mega-handle') === handle) return panels[i];
      }
      return null;
    }

    function triggersFor(handle) {
      var list = [];
      triggers.forEach(function (t) {
        if (t.getAttribute('data-mega-handle') === handle) list.push(t);
      });
      return list;
    }

    function openMega(handle) {
      if (!isDesktop()) return;
      if (openTimer) { clearTimeout(openTimer); openTimer = null; }
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      if (currentHandle && currentHandle !== handle) hideMega(currentHandle);
      var panel = panelFor(handle);
      if (!panel) return;
      panel.removeAttribute('hidden');
      panel.setAttribute('data-open', 'true');
      triggersFor(handle).forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });
      currentHandle = handle;
    }

    function hideMega(handle) {
      var panel = panelFor(handle);
      if (!panel) return;
      panel.setAttribute('hidden', '');
      panel.removeAttribute('data-open');
      triggersFor(handle).forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
      if (currentHandle === handle) currentHandle = null;
    }

    function scheduleClose(handle) {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { hideMega(handle); }, 180);
    }

    triggers.forEach(function (trigger) {
      var handle = trigger.getAttribute('data-mega-handle');
      if (!handle) return;
      var parentItem = trigger.closest('.site-header__nav-item') || trigger.parentElement;

      var onEnter = function () {
        if (!isDesktop()) return;
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        openTimer = setTimeout(function () { openMega(handle); }, 60);
      };
      var onLeave = function () {
        if (!isDesktop()) return;
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        scheduleClose(handle);
      };

      if (parentItem) {
        parentItem.addEventListener('mouseenter', onEnter);
        parentItem.addEventListener('mouseleave', onLeave);
      }
      trigger.addEventListener('focusin', onEnter);
      trigger.addEventListener('click', function (event) {
        // On desktop the hover opens the panel; clicks toggle for
        // keyboard users without hover. On mobile the panel is never
        // surfaced via this trigger (mobile uses the drawer).
        if (!isDesktop()) return;
        event.preventDefault();
        if (currentHandle === handle) hideMega(handle);
        else openMega(handle);
      });

      var panel = panelFor(handle);
      if (panel) {
        panel.addEventListener('mouseenter', function () {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        });
        panel.addEventListener('mouseleave', onLeave);
        panel.addEventListener('focusout', function (event) {
          var next = event.relatedTarget;
          if (next && (panel.contains(next) || (parentItem && parentItem.contains(next)))) return;
          scheduleClose(handle);
        });
      }
    });

    // Outside click closes any open panel.
    document.addEventListener('click', function (event) {
      if (!currentHandle) return;
      var panel = panelFor(currentHandle);
      var triggersList = triggersFor(currentHandle);
      var inside = (panel && panel.contains(event.target)) ||
                   triggersList.some(function (t) { return t.contains(event.target); });
      if (!inside) hideMega(currentHandle);
    });

    // Escape closes any open panel.
    document.addEventListener('keydown', function (event) {
      if ((event.key === 'Escape' || event.keyCode === 27) && currentHandle) {
        hideMega(currentHandle);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Submenu disclosure triggers (desktop has-children links).
  // The mobile drawer uses native <details>/<summary>, which already handles
  // aria-expanded via SummaryDetails in global.js.
  // ---------------------------------------------------------------------------
  function initSubmenuTriggers() {
    var triggers = document.querySelectorAll('[data-submenu-trigger]');
    if (!triggers.length) return;
    triggers.forEach(function (trigger) {
      var item = trigger.closest('.site-header__nav-item') || trigger.parentElement;
      if (!item) return;
      var submenu = item.querySelector('[data-submenu]');
      if (!submenu) return;

      var onEnter = function () {
        if (!isDesktop()) return;
        trigger.setAttribute('aria-expanded', 'true');
        submenu.setAttribute('data-open', 'true');
      };
      var onLeave = function () {
        if (!isDesktop()) return;
        trigger.setAttribute('aria-expanded', 'false');
        submenu.removeAttribute('data-open');
      };

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);
      trigger.addEventListener('focusin', onEnter);
      item.addEventListener('focusout', function (event) {
        if (event.relatedTarget && item.contains(event.relatedTarget)) return;
        onLeave();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Localization forms
  // Auto-submit the localization form when the <select> value changes.
  // ---------------------------------------------------------------------------
  function initLocalizationForms() {
    var selects = document.querySelectorAll(
      '.localization-form select[name="country_code"], .localization-form select[name="locale_code"]'
    );
    if (!selects.length) return;
    selects.forEach(function (select) {
      select.addEventListener('change', function () {
        var form = select.closest('form');
        if (form) form.submit();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  function init() {
    try { initMobileDrawer(); } catch (e) { /* silent */ }
    try { initMegaMenus(); } catch (e) { /* silent */ }
    try { initSubmenuTriggers(); } catch (e) { /* silent */ }
    try { initLocalizationForms(); } catch (e) { /* silent */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
