(function () {
  'use strict';

  var LEVYNCHI_DEBUG =
    typeof window !== 'undefined' &&
    (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname) ||
      /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search || '') ||
      (window.localStorage && window.localStorage.getItem('levynchi_debug') === '1'));

  function dbg() {
    if (!LEVYNCHI_DEBUG || typeof console === 'undefined') return;
    var parts = ['[Levynchi]'];
    for (var i = 0; i < arguments.length; i++) parts.push(arguments[i]);
    if (console.debug) console.debug.apply(console, parts);
    else if (console.log) console.log.apply(console, parts);
  }

  var TITLES = {
    home: 'Levynchi',
    projects: 'פרויקטים — Levynchi',
    about: 'אודות — Levynchi',
  };

  var stage    = document.querySelector('.stage');
  var views    = {};
  var paths    = { home: '/', projects: '/projects/', about: '/about/' };
  var animating = false;

  document.querySelectorAll('.view[data-view]').forEach(function (el) {
    views[el.getAttribute('data-view')] = el;
  });

  function normalizePath(p) {
    if (!p || p === '/') return '/';
    return p.endsWith('/') ? p : p + '/';
  }

  function pathForRoute(route) {
    if (route === 'about') return normalizePath(paths.about);
    if (route === 'projects') return normalizePath(paths.projects);
    return normalizePath(paths.home);
  }

  function routeFromPath(pathname) {
    var p = normalizePath(pathname);
    var aboutP = normalizePath(paths.about);
    var projP = normalizePath(paths.projects);
    if (p === aboutP || p.endsWith('/about/')) return 'about';
    if (p === projP || p.endsWith('/projects/')) return 'projects';
    return 'home';
  }

  function hydratePaths() {
    document.querySelectorAll('.js-spa-nav[data-route][data-path]').forEach(function (a) {
      var r = a.getAttribute('data-route');
      var p = a.dataset.path;
      if (r && p) paths[r] = normalizePath(p);
    });
  }

  function prefersReducedMotion() {
    var stored = window.localStorage && window.localStorage.getItem('levynchi_anim');
    if (stored === '1') return false;
    if (stored === '0') return true;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function maybeShowAnimBanner() {
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var stored = window.localStorage && window.localStorage.getItem('levynchi_anim');
    if (stored !== null) return;

    var banner = document.createElement('div');
    banner.className = 'anim-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'הגדרות אנימציה');
    banner.innerHTML =
      '<p class="anim-banner__text">האנימציות מושבתות במכשיר שלך — להפעיל אנימציות באתר?</p>' +
      '<div class="anim-banner__actions">' +
        '<button type="button" class="anim-banner__btn anim-banner__btn--yes">הפעל</button>' +
        '<button type="button" class="anim-banner__btn anim-banner__btn--no">לא תודה</button>' +
      '</div>';

    function hideBanner() {
      banner.classList.add('anim-banner--hidden');
      setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
    }

    banner.querySelector('.anim-banner__btn--yes').addEventListener('click', function () {
      window.localStorage.setItem('levynchi_anim', '1');
      hideBanner();
    });
    banner.querySelector('.anim-banner__btn--no').addEventListener('click', function () {
      window.localStorage.setItem('levynchi_anim', '0');
      hideBanner();
    });

    document.body.appendChild(banner);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('anim-banner--visible'); });
    });
  }

  function applyView(route) {
    var active = views[route];
    if (!active) return;
    dbg('applyView', route);
    Object.keys(views).forEach(function (key) {
      var el = views[key];
      var on = el === active;
      el.classList.toggle('view--active', on);
      if (on) {
        el.removeAttribute('aria-hidden');
        el.removeAttribute('inert');
      } else {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('inert', '');
      }
    });
    document.title = TITLES[route] || TITLES.home;
    if (stage) stage.setAttribute('data-active-view', route);
  }

  function getActiveRoute() {
    return (stage && stage.getAttribute('data-active-view')) || 'home';
  }

  /* ── Swing page transition using View Transitions API ── */
  function runPageTransition(route) {
    var from = getActiveRoute();
    if (from === route) return;

    var toEl = views[route];

    function doSwitch() {
      applyView(route);
      if (toEl) { toEl.scrollTop = 0; toEl.focus({ preventScroll: true }); }
    }

    if (prefersReducedMotion() || !document.startViewTransition) {
      doSwitch();
      animating = false;
      return;
    }

    animating = true;

    var vt = document.startViewTransition(function () {
      doSwitch();
    });

    vt.ready.then(function () {
      // Old page spins out — rotates 180deg and shrinks
      document.documentElement.animate(
        [
          { transform: 'rotate(0deg)    scale(1)', opacity: 1 },
          { transform: 'rotate(180deg)  scale(0)', opacity: 0 }
        ],
        { duration: 380, easing: 'ease-in', fill: 'both', pseudoElement: '::view-transition-old(stage)' }
      );
      // New page spins in — from -180deg
      document.documentElement.animate(
        [
          { transform: 'rotate(-180deg) scale(0)', opacity: 0 },
          { transform: 'rotate(0deg)    scale(1)', opacity: 1 }
        ],
        { duration: 380, easing: 'ease-out', fill: 'both', pseudoElement: '::view-transition-new(stage)' }
      );
    });

    vt.finished.then(function () {
      animating = false;
    }).catch(function () {
      animating = false;
    });
  }

  function navigate(route, opts) {
    opts = opts || {};
    if (animating) { dbg('navigate ignored (animating)'); return; }
    var from = getActiveRoute();
    if (from === route) return;
    var url = pathForRoute(route);
    dbg('navigate', from, '→', route, url);
    if (opts.history !== false) history.pushState({ route: route }, '', url);
    runPageTransition(route);
  }

  function onPopState() {
    if (animating) { dbg('popstate ignored (animating)'); return; }
    var from  = getActiveRoute();
    var route = routeFromPath(window.location.pathname);
    if (from === route) return;
    dbg('popstate', from, '→', route);
    runPageTransition(route);
  }

  window.togglePreview = function (e, id) {
    if (e) e.preventDefault();
    var preview = document.getElementById(id);
    if (!preview) return;
    var wrapper = preview.closest('.link-card-wrapper');
    var isOpen  = preview.classList.contains('open');
    preview.classList.toggle('open');
    if (wrapper) wrapper.classList.toggle('wrapper--open', !isOpen);
    if (!isOpen) {
      var iframe = preview.querySelector('iframe');
      if (iframe && iframe.dataset.src) {
        var src = window.location.origin + iframe.dataset.src;
        if (!iframe.getAttribute('src')) iframe.setAttribute('src', src);
      }
      setTimeout(function () {
        var scrollEl = document.querySelector('.view.view--active') || document.scrollingElement;
        if (wrapper && scrollEl) {
          var top = wrapper.getBoundingClientRect().top + window.pageYOffset - 16;
          scrollEl.scrollTo({ top: top, behavior: 'smooth' });
        }
      }, 420);
    }
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest('.js-preview-toggle');
    if (!t) return;
    var pid = t.getAttribute('data-preview-id');
    if (pid) window.togglePreview(e, pid);
  });

  document.querySelectorAll('.js-spa-nav').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var route = a.getAttribute('data-route');
      if (!route) return;
      navigate(route, { history: true });
    });
  });

  window.addEventListener('popstate', onPopState);

  document.querySelectorAll('.js-scroll-portfolio').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var list = document.querySelector('.view--home .links-list');
      if (list && list.lastElementChild)
        list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  });

  document.querySelectorAll('.contact-form').forEach(function (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  });

  function init() {
    hydratePaths();
    maybeShowAnimBanner();
    var route = routeFromPath(window.location.pathname);
    dbg('init', 'route=', route);
    history.replaceState({ route: route }, '', pathForRoute(route));
    applyView(route);
    var panel = views[route];
    if (panel) panel.focus({ preventScroll: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
