/*
 * main.js
 * -------
 * Site-wide behaviors, wrapped in a jQuery IIFE.
 *
 * Design goals:
 *  - DEFENSIVE: every block guards against missing markup or missing plugins,
 *    so any individual page can omit a library (Isotope, Owl Carousel) or a
 *    DOM section without throwing a JS error that would halt the rest of the
 *    script.
 *  - Documented: each block is annotated to explain WHAT it does and WHY the
 *    guards / event-delegation choices are made the way they are.
 *
 * The single argument `$` is the jQuery instance passed in at the bottom, so
 * the `$` shorthand is safe even if the page also loads other libraries that
 * claim the global `$`.
 */
(function ($) {
    "use strict";

    // ---------------------------------------------------------------------
    // Shared constants
    // ---------------------------------------------------------------------
    // Bootstrap's "lg" breakpoint. Above this we treat the device as a
    // desktop and enable hover-to-open dropdowns; at/below it we keep
    // Bootstrap's default click/tap behavior (better for touch).
    var DESKTOP_MIN_WIDTH = 992;

    // Scroll depth (in px) the user must pass before the back-to-top button
    // becomes useful enough to reveal.
    var BACK_TO_TOP_THRESHOLD = 300;

    // ---------------------------------------------------------------------
    // 1. Navbar dropdown-on-hover (desktop only)
    // ---------------------------------------------------------------------
    // The navbar is injected asynchronously (via an HTML partial), so binding
    // on $(document).ready would attach to elements that don't exist yet.
    // Instead we expose initNavbar() and run it when the partials-loading code
    // fires the custom 'partials:loaded' event on `document`.
    //
    // Behavior:
    //  - Desktop (width > DESKTOP_MIN_WIDTH): open the dropdown on mouseenter
    //    and close it on mouseleave by triggering Bootstrap's toggle.
    //  - Touch / narrow viewports: do NOT attach hover handlers; Bootstrap's
    //    built-in click/tap toggle is left untouched.
    //  - Re-evaluated on window resize so rotating a tablet or resizing a
    //    desktop window switches modes correctly.
    function initNavbar() {
        // Namespaced events ('.navHover') let us detach ONLY our handlers
        // without disturbing Bootstrap's own click listeners.
        function toggleNavbarMethod() {
            var $dropdowns = $('.navbar .dropdown');

            // Defensive: if there are no navbar dropdowns on this page,
            // there's nothing to wire up.
            if (!$dropdowns.length) {
                return;
            }

            if ($(window).width() > DESKTOP_MIN_WIDTH) {
                // Desktop: rebind hover handlers. Remove first to avoid
                // stacking duplicate handlers across multiple resize events.
                $dropdowns
                    .off('mouseenter.navHover mouseleave.navHover')
                    .on('mouseenter.navHover', function () {
                        // Open the menu by triggering the toggle if it's closed.
                        var $toggle = $('.dropdown-toggle', this);
                        if (!$(this).hasClass('show')) {
                            $toggle.trigger('click');
                        }
                    })
                    .on('mouseleave.navHover', function () {
                        // Close the menu by triggering the toggle if it's open,
                        // then blur so the focus ring doesn't linger.
                        var $toggle = $('.dropdown-toggle', this);
                        if ($(this).hasClass('show')) {
                            $toggle.trigger('click').blur();
                        }
                    });
            } else {
                // Touch / mobile: strip our hover handlers and let Bootstrap's
                // default click behavior take over.
                $dropdowns.off('mouseenter.navHover mouseleave.navHover');
            }
        }

        // Evaluate immediately for the current viewport...
        toggleNavbarMethod();

        // ...and again whenever the viewport changes size. The resize handler
        // is namespaced so repeated initNavbar() calls (e.g. partials loaded
        // more than once) don't pile up duplicate resize listeners.
        $(window).off('resize.navHover').on('resize.navHover', toggleNavbarMethod);
    }

    // Run initNavbar() once the injected partials are in the DOM. Using the
    // custom event keeps this decoupled from whatever loads the partials.
    $(document).on('partials:loaded', initNavbar);

    // ---------------------------------------------------------------------
    // 2. Back-to-top button
    // ---------------------------------------------------------------------
    // Click handling uses event DELEGATION on `document`, so it works even if
    // the .back-to-top element is injected after this script runs (e.g. inside
    // a footer partial). Smooth-scrolls to the top using the easeInOutExpo
    // easing if jQuery Easing is available; otherwise jQuery's default easing.
    $(document).on('click', '.back-to-top', function () {
        // Use easeInOutExpo only when the easing plugin actually registered it,
        // so the animation still runs (with default easing) on pages that omit
        // the easing library.
        var easing = ($.easing && $.easing.easeInOutExpo) ? 'easeInOutExpo' : 'swing';
        $('html, body').animate({ scrollTop: 0 }, 1500, easing);
        return false; // prevent default anchor jump + stop bubbling
    });

    // Reveal the button only after a meaningful scroll depth, and hide it again
    // near the top. Namespaced scroll handler keeps it isolated.
    $(window).on('scroll.backToTop', function () {
        var $btn = $('.back-to-top');

        // Defensive: nothing to fade if the button isn't on this page.
        if (!$btn.length) {
            return;
        }

        if ($(this).scrollTop() > BACK_TO_TOP_THRESHOLD) {
            $btn.fadeIn('slow');
        } else {
            $btn.fadeOut('slow');
        }
    });

    // ---------------------------------------------------------------------
    // 3. Portfolio Isotope grid + filtering
    // ---------------------------------------------------------------------
    // Only initialize when BOTH the Isotope plugin is loaded AND a
    // .portfolio-container actually exists on the page. This keeps pages
    // without a portfolio (or without the plugin) error-free.
    if ($.fn.isotope && $('.portfolio-container').length) {
        // Build the Isotope layout instance once and reuse it for filtering.
        var portfolioIsotope = $('.portfolio-container').isotope({
            itemSelector: '.portfolio-item',
            layoutMode: 'fitRows'
        });

        // Wire up the filter buttons. Each <li> carries a data-filter selector.
        $('#portfolio-flters li').on('click', function () {
            var $buttons = $('#portfolio-flters li');

            // Update visual + accessibility state: clear all, set this one.
            $buttons.removeClass('active').attr('aria-pressed', 'false');
            $(this).addClass('active').attr('aria-pressed', 'true');

            // Apply the selected filter to the Isotope grid.
            portfolioIsotope.isotope({ filter: $(this).data('filter') });
        });
    }

    // ---------------------------------------------------------------------
    // 4. Owl Carousels
    // ---------------------------------------------------------------------
    // Only run if the Owl Carousel plugin is present. Each .owlCarousel() call
    // is internally a no-op on an empty jQuery set, so a page can include one
    // carousel type without the other and stay error-free.
    if ($.fn.owlCarousel) {
        // Blog / post carousel: autoplaying, looping, with nav arrows.
        $('.post-carousel').owlCarousel({
            autoplay: true,
            smartSpeed: 1500,
            dots: false,
            loop: true,
            nav: true,
            navText: [
                '<i class="fa fa-angle-left" aria-hidden="true"></i>',
                '<i class="fa fa-angle-right" aria-hidden="true"></i>'
            ],
            responsive: {
                0:   { items: 1 },
                576: { items: 1 },
                768: { items: 2 },
                992: { items: 2 }
            }
        });

        // Testimonials carousel: centered, autoplaying, looping, with dots.
        $('.testimonial-carousel').owlCarousel({
            center: true,
            autoplay: true,
            smartSpeed: 2000,
            dots: true,
            loop: true,
            responsive: {
                0:   { items: 1 },
                576: { items: 1 },
                768: { items: 2 },
                992: { items: 3 }
            }
        });
    }

    // ---------------------------------------------------------------------
    // 5. "Coming soon" links
    // ---------------------------------------------------------------------
    // Delegated so it covers links rendered now or injected later. Simply
    // prevents navigation for any element flagged .coming-soon (placeholder
    // links for not-yet-built pages).
    $(document).on('click', '.coming-soon', function (e) {
        e.preventDefault();
    });

})(jQuery);
