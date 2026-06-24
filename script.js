/* ============================================================
   VARBOK — script.js
   ============================================================ */

'use strict';

/* ============================================================
   1. SMOOTH SCROLL FOR ANCHOR LINKS
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    var navHeight = document.getElementById('nav') ? document.getElementById('nav').offsetHeight : 0;
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    // Close mobile menu if open
    closeMobileMenu();
  });
});

/* ============================================================
   2. MOBILE MENU TOGGLE
   ============================================================ */
var hamburger = document.getElementById('hamburger');
var mobileMenu = document.getElementById('mobile-menu');
var mobileMenuClose = document.getElementById('mobile-menu-close');

function openMobileMenu() {
  if (!mobileMenu || !hamburger) return;
  mobileMenu.classList.add('open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  hamburger.classList.add('active');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  if (!mobileMenu || !hamburger) return;
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (hamburger) {
  hamburger.addEventListener('click', function () {
    if (mobileMenu.classList.contains('open')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
}

if (mobileMenuClose) {
  mobileMenuClose.addEventListener('click', closeMobileMenu);
}

// Close on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeMobileMenu();
});

/* ============================================================
   3. INTERSECTION OBSERVER — fade-in on scroll
   ============================================================ */
var fadeElements = document.querySelectorAll('.fade-in');

var fadeObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      // Stagger siblings slightly for a cascade effect
      var siblings = entry.target.parentElement
        ? Array.from(entry.target.parentElement.querySelectorAll('.fade-in:not(.visible)'))
        : [];
      var index = siblings.indexOf(entry.target);
      var delay = Math.min(index * 80, 400); // max 400ms stagger
      setTimeout(function () {
        entry.target.classList.add('visible');
      }, delay);
      fadeObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -48px 0px'
});

fadeElements.forEach(function (el) {
  fadeObserver.observe(el);
});

/* ============================================================
   4. ANIMATED NUMBER COUNTERS
   ============================================================ */
function animateCounter(el) {
  var target = parseInt(el.getAttribute('data-target'), 10);
  var suffix = el.getAttribute('data-suffix') || '';
  var duration = 1500; // ms
  var startTime = null;
  var startValue = 0;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var eased = easeOutQuart(progress);
    var current = Math.round(startValue + (target - startValue) * eased);

    // Format large numbers with commas
    el.textContent = current.toLocaleString() + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target.toLocaleString() + suffix;
    }
  }

  requestAnimationFrame(step);
}

var counterElements = document.querySelectorAll('.stat-num[data-target]');
var countersStarted = new WeakSet();

var counterObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting && !countersStarted.has(entry.target)) {
      countersStarted.add(entry.target);
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counterElements.forEach(function (el) {
  counterObserver.observe(el);
});

/* ============================================================
   5. FORM SUBMIT HANDLER
   ============================================================ */
var applyForm = document.getElementById('apply-form');
var formSuccess = document.getElementById('form-success');

if (applyForm) {
  applyForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // Basic validation
    var name = applyForm.querySelector('#name');
    var email = applyForm.querySelector('#email');
    var stream = applyForm.querySelector('#stream');
    var why = applyForm.querySelector('#why');

    var valid = true;

    [name, email, stream, why].forEach(function (field) {
      if (!field || !field.value.trim()) {
        field.style.borderColor = '#f87171';
        valid = false;
        setTimeout(function () {
          field.style.borderColor = '';
        }, 2500);
      }
    });

    if (!valid) return;

    // Simulate async submission
    var submitBtn = applyForm.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Submitting…';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
    }

    setTimeout(function () {
      // Hide form fields and show success
      applyForm.querySelectorAll('.form-group, .form-row, [type="submit"]').forEach(function (el) {
        el.style.display = 'none';
      });

      if (formSuccess) {
        formSuccess.classList.add('show');
      }
    }, 900);
  });
}

/* ============================================================
   6. NAV — Add scrolled class for enhanced blur
   ============================================================ */
var nav = document.getElementById('nav');

window.addEventListener('scroll', function () {
  if (!nav) return;
  if (window.pageYOffset > 20) {
    nav.style.background = 'rgba(5, 8, 16, 0.92)';
  } else {
    nav.style.background = 'rgba(5, 8, 16, 0.75)';
  }
}, { passive: true });
