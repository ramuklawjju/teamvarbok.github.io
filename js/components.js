/**
 * components.js
 *
 * Dependency-free vanilla JS partial loader.
 *
 * Responsibilities:
 *   1. Find every element marked with [data-include] and replace it with the
 *      markup fetched from the URL named in that attribute.
 *   2. Once ALL partials have been injected, highlight the active navbar link
 *      and broadcast a 'partials:loaded' event so other scripts (e.g. main.js)
 *      can safely bind behaviors to the freshly injected DOM.
 *
 * No external libraries are used — only the standard fetch / Promise APIs.
 */

// Wait until the initial HTML document is fully parsed before touching the DOM.
document.addEventListener('DOMContentLoaded', function () {
  // Reveal page content + wire navbar elevation immediately. These are vanilla
  // and same-origin, so they run even if the CDN-hosted jQuery fails to load —
  // core content is never left stuck at opacity:0.
  initReveal();
  initNavbarScroll();
  animateCounters();

  // Collect every placeholder element that requests an HTML partial.
  // Each such element carries a "data-include" attribute holding the URL.
  var includes = document.querySelectorAll('[data-include]');

  // Build one fetch Promise per placeholder. Each Promise resolves after the
  // placeholder has been replaced (or after a failure has been logged).
  var loaders = Array.prototype.map.call(includes, function (element) {
    // Read the partial's URL from the data-include attribute.
    var url = element.getAttribute('data-include');

    // Fetch the partial as text, then swap the placeholder for the markup.
    return fetch(url)
      .then(function (response) {
        // Guard against HTTP error statuses (404, 500, etc.) which fetch
        // does NOT treat as rejected by default.
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' for ' + url);
        }
        // Resolve with the raw HTML string of the partial.
        return response.text();
      })
      .then(function (html) {
        // Replace the placeholder element entirely with the fetched markup.
        // Using outerHTML drops the [data-include] wrapper from the DOM.
        element.outerHTML = html;
      })
      .catch(function (error) {
        // Handle any fetch/parse failure gracefully: log it, never throw,
        // so a single broken partial cannot abort the whole page load.
        console.error('Failed to load partial "' + url + '":', error);
      });
  });

  // Wait for every partial to settle (each Promise already swallows its own
  // errors, so Promise.all here will always resolve).
  Promise.all(loaders).then(function () {
    // All partials are now in the DOM — highlight the correct nav link.
    setActiveNav();

    // Re-scan for reveal targets inside the injected footer, and sync the
    // navbar elevation state now that the navbar element exists.
    initReveal();
    updateNavbar();
    applyAnnounce();

    // Notify the rest of the app that injected markup is ready. Listeners
    // such as main.js use this to attach navbar/form behaviors at a safe time.
    document.dispatchEvent(new CustomEvent('partials:loaded'));
  });
});

/**
 * initReveal — progressive scroll-reveal via IntersectionObserver.
 *
 * Elements with class "reveal" fade + rise into view as they enter the
 * viewport. The hidden start state is gated by the "js" class on <html> (set
 * inline in <head>), and prefers-reduced-motion shows everything instantly
 * (handled in CSS). Safe to call multiple times — it only observes elements
 * not yet revealed.
 */
function initReveal() {
  var els = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!els.length) { return; }
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
}

/**
 * Navbar elevation — adds .navbar-scrolled once the page is scrolled past a
 * small threshold. rAF-throttled; the wrapper is queried lazily because the
 * navbar is injected from a partial.
 */
var navTicking = false;
function updateNavbar() {
  var nav = document.querySelector('.container-fluid.bg-light.position-relative');
  if (nav) { nav.classList.toggle('navbar-scrolled', window.pageYOffset > 12); }
  navTicking = false;
}
function initNavbarScroll() {
  window.addEventListener('scroll', function () {
    if (!navTicking) { window.requestAnimationFrame(updateNavbar); navTicking = true; }
  }, { passive: true });
  updateNavbar();
}

/**
 * animateCounters — counts the stats numbers up from 0 when scrolled into view.
 * Honors prefers-reduced-motion (shows the final value immediately).
 */
function animateCounters() {
  var els = document.querySelectorAll('[data-target]');
  if (!els.length) { return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run(el) {
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (reduce) { el.textContent = target.toLocaleString(); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) { start = ts; }
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) { window.requestAnimationFrame(step); }
    }
    window.requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, run);
    return;
  }
  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  Array.prototype.forEach.call(els, function (el) {
    if (!reduce) { el.textContent = '0'; } // start from 0 to avoid a flash
    io.observe(el);
  });
}

/**
 * Announcement bar — hide it if dismissed earlier this browser session.
 */
function applyAnnounce() {
  try {
    if (sessionStorage.getItem('varbok-announce') === 'off') {
      var a = document.getElementById('announce');
      if (a) { a.classList.add('is-hidden'); }
    }
  } catch (e) { /* sessionStorage unavailable */ }
}

// Dismiss the announcement bar on close-button click (delegated; the bar is
// injected with the navbar partial). Remembered for the session.
document.addEventListener('click', function (e) {
  var t = e.target;
  var isClose = t && (t.id === 'announceClose' || (t.closest && t.closest('#announceClose')));
  if (!isClose) { return; }
  var a = document.getElementById('announce');
  if (a) { a.classList.add('is-hidden'); }
  try { sessionStorage.setItem('varbok-announce', 'off'); } catch (err) {}
});

/**
 * setActiveNav
 *
 * Marks the navbar link that corresponds to the current page as "active",
 * and (for blog/single pages) also activates the "Pages" dropdown toggle.
 *
 * Runs only after the navbar partial has been injected into the DOM.
 */
function setActiveNav() {
  // Derive the current page's filename from the URL path. Splitting on "/"
  // and taking the last segment yields the file (e.g. "/about.html" -> "about.html").
  var path = location.pathname;
  var current = path.split('/').pop();

  // Treat an empty segment or a bare "/" (root) as the site's index page.
  if (current === '' || current === '/') {
    current = 'index.html';
  }

  // Iterate over every navbar link and compare its target filename to the
  // current page.
  var links = document.querySelectorAll('.navbar-nav .nav-link');
  Array.prototype.forEach.call(links, function (link) {
    // Pull the link's href and reduce it to just its filename segment so the
    // comparison ignores any directory prefix (relative or absolute).
    var href = link.getAttribute('href') || '';
    var target = href.split('/').pop();

    // If the link points at the current page, flag it as active for both
    // styling (class) and assistive technology (aria-current).
    if (target === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // The "Pages" dropdown contains blog.html and single.html. When the current
  // page is one of those, also light up the dropdown toggle itself so the
  // parent menu reflects the active section.
  if (current === 'blog.html' || current === 'single.html') {
    // Find the dropdown toggle whose visible text is "Pages".
    var toggles = document.querySelectorAll('.navbar-nav .nav-link.dropdown-toggle');
    Array.prototype.forEach.call(toggles, function (toggle) {
      // Match on trimmed text content to identify the "Pages" toggle.
      if (toggle.textContent.trim() === 'Pages') {
        toggle.classList.add('active');
        toggle.setAttribute('aria-current', 'page');
      }
    });
  }
}
