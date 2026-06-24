/*
 * contact.js — Static-hosting form handling via Formspree.
 *
 * This site is hosted statically (e.g. GitHub Pages), so there is no PHP/server
 * to receive form posts. Instead we submit forms directly to Formspree using
 * `fetch` with `Accept: application/json`, which makes Formspree return a JSON
 * response (instead of redirecting), letting us show inline feedback.
 *
 * Two independent mechanisms live here:
 *   (1) jQuery + jqBootstrapValidation wiring for the main contact form
 *       (#contactForm). Kept as-is structurally, but the AJAX target is now the
 *       form's Formspree `action` and feedback is rendered into #success.
 *   (2) A vanilla-JS delegated handler for ALL OTHER forms marked
 *       [data-formspree] (e.g. the footer newsletter, a book-a-seat form).
 *       Delegation on `document` means it works even if those forms are
 *       injected late (partials loaded after this script runs).
 *
 * Graceful demo mode: if a form's `action` still contains the placeholder
 * "YOUR_FORM_ID" (i.e. Formspree has not been configured yet), we DO NOT fetch.
 * Instead we show a friendly success message so the form is never a dead end.
 */

/* ------------------------------------------------------------------ *
 * Shared helpers (used by both mechanisms)
 * ------------------------------------------------------------------ */

// True when the action is missing or still holds the Formspree placeholder.
// In that case we run "demo mode" instead of hitting the network.
function formspreeIsUnconfigured(action) {
    return !action || action.indexOf("YOUR_FORM_ID") !== -1;
}

// Best-effort extraction of a person's name from a set of fields, so demo-mode
// and error messages can be personable. Falls back to "there".
function formspreeGuessName(fields) {
    if (!fields) {
        return "there";
    }
    var value = fields.name || fields.Name || fields.fullname || fields["full-name"];
    return value && String(value).trim() ? String(value).trim() : "there";
}

/* ------------------------------------------------------------------ *
 * (1) Main contact form: jqBootstrapValidation + Formspree fetch
 * ------------------------------------------------------------------ */

$(function () {

    // Keep the existing client-side validation wiring. jqBootstrapValidation
    // validates the required inputs and only calls submitSuccess once they pass.
    //
    // Guard: the jqBootstrapValidation plugin is only loaded on the contact
    // page (the only page with #contactForm). Other pages include contact.js
    // purely for the delegated [data-formspree] handler further down, so skip
    // this block instead of throwing a TypeError when the plugin is absent.
    if ($.fn && $.fn.jqBootstrapValidation) {
    $("#contactForm input, #contactForm textarea").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function ($form, event, errors) {
            // Validation failed; jqBootstrapValidation already shows the inline
            // .help-block messages, so nothing extra is needed here.
        },
        submitSuccess: function ($form, event) {
            // Stop the browser's default (full-page) form submission — we send
            // the data ourselves via fetch so we can show inline feedback.
            event.preventDefault();

            // Collect the field values.
            var name = $("input#name").val();
            var email = $("input#email").val();
            var subject = $("input#subject").val();
            var message = $("textarea#message").val();

            // The Formspree endpoint is the form's `action` attribute.
            var action = $form.attr("action");

            // Disable the button while we work, to prevent double submits.
            var $button = $("#sendMessageButton");
            $button.prop("disabled", true);

            // Always re-enable the button shortly after we finish (success,
            // failure, or demo mode), mirroring the original behaviour.
            function reEnableButton() {
                setTimeout(function () {
                    $button.prop("disabled", false);
                }, 1000);
            }

            // Render a Bootstrap alert into #success. `type` is "success" or
            // "danger"; `message` is plain text (escaped via jQuery .text()).
            function showAlert(type, htmlSafeText) {
                var $alert = $("<div>")
                    .addClass("alert alert-" + type)
                    .attr("role", "alert");

                // Dismiss (×) button, consistent with the original markup.
                $("<button>")
                    .attr("type", "button")
                    .addClass("close")
                    .attr("data-dismiss", "alert")
                    .attr("aria-hidden", "true")
                    .html("&times;")
                    .appendTo($alert);

                // The actual message text.
                $("<strong>").text(htmlSafeText).appendTo($alert);

                $("#success").empty().append($alert);
            }

            // ---- Demo mode: no real Formspree endpoint configured ----------
            if (formspreeIsUnconfigured(action)) {
                showAlert(
                    "success",
                    "Thanks, " + name + "! (Demo mode — connect a Formspree endpoint to receive messages.)"
                );
                $form.trigger("reset");
                reEnableButton();
                return;
            }

            // ---- Real submission to Formspree via fetch --------------------
            fetch(action, {
                method: "POST",
                headers: {
                    // Tells Formspree to respond with JSON instead of redirecting.
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    subject: subject,
                    message: message
                })
            })
                .then(function (response) {
                    if (response.ok) {
                        // 2xx — Formspree accepted the message.
                        showAlert("success", "Your message has been sent. Thanks, " + name + "!");
                        $form.trigger("reset");
                        return;
                    }
                    // Non-2xx — try to surface Formspree's specific error text.
                    return response.json().then(function (data) {
                        var detail = "";
                        if (data && Array.isArray(data.errors) && data.errors.length) {
                            detail = data.errors.map(function (e) { return e.message; }).join(", ");
                        } else if (data && data.error) {
                            detail = data.error;
                        }
                        showAlert(
                            "danger",
                            detail
                                ? ("Sorry " + name + ", your message could not be sent: " + detail)
                                : ("Sorry " + name + ", your message could not be sent (server returned " + response.status + "). Please try again later.")
                        );
                    }).catch(function () {
                        // Response wasn't JSON; fall back to a status-based message.
                        showAlert(
                            "danger",
                            "Sorry " + name + ", your message could not be sent (server returned " + response.status + "). Please try again later."
                        );
                    });
                })
                .catch(function () {
                    // Network-level failure (offline, DNS, CORS, etc.).
                    showAlert(
                        "danger",
                        "Sorry " + name + ", we couldn't reach the mail server. Please check your connection and try again later."
                    );
                })
                .then(function () {
                    // Runs after both success and error branches above.
                    reEnableButton();
                });
        },
        filter: function () {
            // Only validate fields that are currently visible.
            return $(this).is(":visible");
        }
    });
    }

    // Bootstrap tab switching (kept from the original file).
    $("a[data-toggle=\"tab\"]").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
    });
});

// Clear the contact-form feedback as soon as the user starts a new message.
$('#name').focus(function () {
    $('#success').html('');
});


/* ------------------------------------------------------------------ *
 * (2) All other [data-formspree] forms — vanilla JS, delegated
 * ------------------------------------------------------------------ *
 *
 * Handles forms such as the footer newsletter and a book-a-seat form. Written
 * in plain JS and delegated on `document` so it works no matter when those
 * forms are added to the page (e.g. footer/navbar injected as partials after
 * this script loads). Each such form should:
 *   - carry a `data-formspree` attribute,
 *   - have its `action` set to a Formspree endpoint, and
 *   - contain (or be immediately followed by) a `.form-status` element where
 *     feedback text is written.
 */

(function () {
    "use strict";

    // Find the status element for a form: prefer one inside the form, then fall
    // back to an immediate next sibling. Returns null if none exists.
    function findStatusEl(form) {
        var inside = form.querySelector(".form-status");
        if (inside) {
            return inside;
        }
        if (form.nextElementSibling && form.nextElementSibling.classList.contains("form-status")) {
            return form.nextElementSibling;
        }
        return null;
    }

    // Write feedback text into the form's status element with a success/error class.
    function setStatus(form, isError, text) {
        var el = findStatusEl(form);
        if (!el) {
            return;
        }
        el.textContent = text;
        el.classList.remove("text-success", "text-danger");
        el.classList.add(isError ? "text-danger" : "text-success");
    }

    // Read the form's fields into a plain object (for name-guessing / demo mode).
    function fieldsFromForm(form) {
        var data = new FormData(form);
        var obj = {};
        data.forEach(function (value, key) {
            obj[key] = value;
        });
        return obj;
    }

    // Delegate on document so dynamically injected forms are covered too.
    document.addEventListener("submit", function (event) {
        var form = event.target;

        // Only act on forms explicitly marked for Formspree handling, and never
        // double-handle the jQuery-managed contact form above.
        if (!form || !(form instanceof HTMLFormElement)) {
            return;
        }
        if (!form.hasAttribute("data-formspree") || form.id === "contactForm") {
            return;
        }

        // We're taking over submission for this form.
        event.preventDefault();

        // Native HTML5 validation. report points the browser at the first
        // invalid field and shows its built-in validation bubble.
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        var action = form.getAttribute("action");
        var fields = fieldsFromForm(form);
        var name = formspreeGuessName(fields);

        // Disable the submit button while we work; remember it so we can
        // re-enable it afterwards no matter how the request resolves.
        var submitButton = form.querySelector("[type='submit'], button:not([type])");
        if (submitButton) {
            submitButton.disabled = true;
        }
        function reEnable() {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }

        // ---- Demo mode: unconfigured Formspree placeholder -----------------
        if (formspreeIsUnconfigured(action)) {
            setStatus(
                form,
                false,
                "Thanks, " + name + "! (Demo mode — connect a Formspree endpoint to receive messages.)"
            );
            form.reset();
            reEnable();
            return;
        }

        // ---- Real submission to Formspree ----------------------------------
        // Send FormData (lets Formspree pick up all named fields automatically).
        fetch(action, {
            method: "POST",
            headers: {
                // Ask Formspree for a JSON response rather than a redirect.
                "Accept": "application/json"
            },
            body: new FormData(form)
        })
            .then(function (response) {
                if (response.ok) {
                    setStatus(form, false, "Thanks, " + name + "! Your submission has been received.");
                    form.reset();
                    return;
                }
                // Surface Formspree's specific error message where possible.
                return response.json().then(function (data) {
                    var detail = "";
                    if (data && Array.isArray(data.errors) && data.errors.length) {
                        detail = data.errors.map(function (e) { return e.message; }).join(", ");
                    } else if (data && data.error) {
                        detail = data.error;
                    }
                    setStatus(
                        form,
                        true,
                        detail
                            ? ("Sorry, that didn't go through: " + detail)
                            : ("Sorry, that didn't go through (server returned " + response.status + "). Please try again later.")
                    );
                }).catch(function () {
                    setStatus(
                        form,
                        true,
                        "Sorry, that didn't go through (server returned " + response.status + "). Please try again later."
                    );
                });
            })
            .catch(function () {
                // Network-level failure.
                setStatus(
                    form,
                    true,
                    "Sorry, we couldn't reach the server. Please check your connection and try again."
                );
            })
            .then(function () {
                // Always re-enable the submit button when finished.
                reEnable();
            });
    }, false);
})();
