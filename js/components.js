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

    // Notify the rest of the app that injected markup is ready. Listeners
    // such as main.js use this to attach navbar/form behaviors at a safe time.
    document.dispatchEvent(new CustomEvent('partials:loaded'));
  });
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
