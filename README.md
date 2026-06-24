# Varbok

Varbok is a marketing website for a play-based early-childhood learning centre —
landing pages for classes, team, gallery, and blog, plus contact and booking
forms. It is a static demo site; all copy, names, prices, and contact details are
**placeholder / fictional**.

## Pages

| Page | Description |
|------|-------------|
| `index.html`   | Home — hero, intro, featured classes, facilities, testimonials, CTA. |
| `about.html`   | About the centre — story, values, facilities, team preview. |
| `class.html`   | Class listings with details and a book-a-seat form. |
| `team.html`    | Teacher / staff profiles. |
| `gallery.html` | Photo gallery with Isotope filtering and Lightbox popups. |
| `blog.html`    | Blog index / article listing. |
| `single.html`  | Single blog post with comment + reply form. |
| `contact.html` | Contact page — address, map, and message form. |

## Tech stack

Plain static HTML/CSS/JS — **no build step**. Vendored/CDN libraries:
Bootstrap 4.4.1, jQuery 3.4.1, Owl Carousel, Isotope, Lightbox, Font Awesome 5,
Flaticon.

## Architecture

The shared **navbar and footer live in `partials/`** (`navbar.html`,
`footer.html`) and are injected at runtime by `js/components.js` — a dependency-
free vanilla `fetch` loader that swaps any `[data-include]` element for the
fetched markup. After all partials load it sets the **active nav state
automatically** from the current filename and fires a `partials:loaded` event for
`js/main.js`.

> **IMPORTANT:** because partials are fetched, you **must serve over HTTP**.
> Opening a page via `file://` blocks the fetch (CORS) and the navbar/footer will
> be missing. GitHub Pages serves over HTTPS, so it works in production.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

This is a `<user>.github.io` repo served by **GitHub Pages from the default
branch root** — push to that branch and the site goes live automatically.

## Forms (contact / booking / newsletter)

All forms **POST to Formspree** (handled in `mail/contact.js`). To receive real
submissions, replace the placeholder endpoint
`https://formspree.io/f/YOUR_FORM_ID` in the form `action` attributes (in
`contact.html`, `class.html`, `index.html`, `single.html`, and
`partials/footer.html`). Until you do, forms run in friendly **demo mode** —
they validate and show a success message but send nothing.

## Editing styles

Edit **only the custom section at the bottom of `css/style.css`** — the
`VARBOK DESIGN SYSTEM` banner (~line 9886) onward. Everything above it is
compiled Bootstrap and must not be touched. The original SCSS source lives in
`scss/` (`scss/style.scss`); `css/style.css` is the compiled output every page
links.
