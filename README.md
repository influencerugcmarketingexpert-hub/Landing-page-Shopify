# Orlaven Shopify Theme

A Shopify Online Store 2.0 theme built from the ground up for **Orlaven**, a premium handcrafted leather jackets brand. The theme is written as plain Liquid, HTML, CSS and vanilla JavaScript, with no build step, so it can be uploaded straight to any Shopify store as a ZIP or connected through the GitHub integration.

- 34 editable sections, 44 snippets, 25 templates (including 7 customer templates)
- 11 assets (CSS tokens + component CSS, plus vanilla JS modules)
- Full locale file with every user-facing string in `locales/en.default.json`
- Pre-filled settings for the Orlaven brand (see `config/settings_data.json`)
- Ships with a 15-product demo catalog in Shopify's CSV import format

## Table of contents

1. [Overview](#overview)
2. [What is Orlaven](#what-is-orlaven)
3. [Folder structure](#folder-structure)
4. [Install - Option 1: ZIP upload](#install-option-1-zip-upload)
5. [Install - Option 2: GitHub integration](#install-option-2-github-integration)
6. [Install - Option 3: Shopify CLI](#install-option-3-shopify-cli)
7. [Required Shopify apps](#required-shopify-apps)
8. [Customization guide](#customization-guide)
9. [Metafield setup](#metafield-setup)
10. [Running the validator](#running-the-validator)
11. [Demo content import order](#demo-content-import-order)
12. [Development](#development)
13. [Performance](#performance)
14. [Accessibility](#accessibility)
15. [Credits](#credits)

## Overview

- Shopify Online Store 2.0 (JSON templates + sections everywhere)
- Fully translatable via `locales/en.default.json`
- CSS driven by design tokens declared from theme settings
- Accessible: semantic landmarks, focus styles, skip-to-content link, aria labels
- No framework, no bundler, no build step. Works straight from disk.

## What is Orlaven

Orlaven is a small atelier brand that produces handcrafted full-grain leather jackets in limited runs. Product storytelling on the theme leans into craft (materials, makers, lifetime repairs) rather than heavy discounting.

The default brand tokens shipped with the theme are:

| Token                | Value     | Where it shows                           |
| -------------------- | --------- | ---------------------------------------- |
| `--color-espresso`   | `#2B1F17` | Primary text, primary buttons            |
| `--color-cognac`     | `#9A5A3C` | Accent, links, sale badge                |
| `--color-cream`      | `#F5EFE6` | Primary button text, section backgrounds |
| `--color-ink`        | `#0F0F0F` | Body text                                |
| `--color-beige`      | `#E8DFD2` | Soft section backgrounds                 |
| Heading font         | Cormorant Garamond | All `h1-h6`                     |
| Body font            | Inter     | All body copy                            |
| Page width           | `1440px`  | Max container width                      |

## Folder structure

```
.
├── assets/                      Theme CSS, JS
│   ├── base.css                  Design tokens, resets, utility classes
│   ├── component-cart.css
│   ├── component-footer.css
│   ├── component-header.css
│   ├── component-newsletter.css
│   ├── component-predictive-search.css
│   ├── cart.js                   Cart drawer + line item updates
│   ├── facets.js                 Collection filter state + URL sync
│   ├── global.js                 Global custom elements (summary-details,
│   │                             local-tabs, modal-dialog, etc.)
│   ├── predictive-search.js      Header search
│   └── product.js                PDP gallery + variant picker + sticky ATC
├── config/
│   ├── settings_data.json        Pre-filled Orlaven brand defaults
│   └── settings_schema.json      Theme editor controls (colors, fonts,
│                                 logos, socials, cart behaviour, SEO,
│                                 password page background)
├── layout/
│   ├── password.liquid           Storefront password gate with branded
│   │                             card layout and waitlist capture
│   └── theme.liquid              Global shell: CSS vars from settings,
│                                 preconnects, header + footer, cart
│                                 drawer, script tags
├── locales/
│   └── en.default.json           Every user-facing string
├── sections/                     34 sections
│   ├── announcement-bar.liquid   Top rotating strip
│   ├── blog-preview.liquid       Homepage journal grid
│   ├── brand-story.liquid        Video / poster hero
│   ├── cart-drawer.liquid        Slide-over cart (section-rendering API)
│   ├── collection-hero.liquid    Collection-page hero band
│   ├── contact-form.liquid       Branded contact form + store info
│   ├── custom-banner.liquid      Split-image banner
│   ├── faq.liquid                Accordion + schema.org FAQPage JSON-LD
│   ├── featured-collection.liquid  Product carousel
│   ├── footer.liquid             Footer with columns, socials, payments
│   ├── header.liquid             Sticky header with mega menu
│   ├── hero.liquid               Full-bleed carousel
│   ├── instagram-feed.liquid     Grid of IG tiles
│   ├── lookbook.liquid           Shoppable hotspots
│   ├── main-404.liquid           404 page with search + popular grid
│   ├── main-article.liquid       Article template
│   ├── main-blog.liquid          Blog index
│   ├── main-cart.liquid          Full cart page with upsell
│   ├── main-collection.liquid    Collection grid + facets
│   ├── main-page.liquid          Generic page template
│   ├── main-product.liquid       Product page layout
│   ├── main-search.liquid        Search results
│   ├── marquee-text.liquid       Scrolling text band
│   ├── material-guide.liquid     Materials storytelling grid
│   ├── multicolumn.liquid        Features / team / values columns
│   ├── newsletter.liquid         Full-bleed newsletter band
│   ├── press-strip.liquid        Press logos marquee
│   ├── product-recommendations.liquid  Shopify-powered recommendations
│   ├── recently-viewed-products.liquid Recently viewed grid
│   ├── reviews-ugc.liquid        Reviews + customer photos
│   ├── shop-by-category.liquid   Category tile grid
│   ├── shop-by-style.liquid      Style (biker / bomber / etc.) grid
│   ├── size-guide.liquid         Tabbed size tables
│   └── trust-strip.liquid        Shipping / returns / warranty strip
├── snippets/                    44 snippets
│   ├── cart-drawer.liquid        Drawer markup (rendered by cart section)
│   ├── cart-icon-bubble.liquid   Cart icon + count badge
│   ├── facets.liquid             Filter UI for collection + search
│   ├── free-shipping-bar.liquid  Cart progress bar
│   ├── icon-*.liquid             24 icons (social, ui, craftsmanship)
│   ├── json-ld.liquid            Product / collection / article schema
│   ├── meta-tags.liquid          OG + Twitter + canonical
│   ├── pagination.liquid
│   ├── predictive-search.liquid  Live search results
│   ├── price.liquid              Consistent price rendering
│   ├── product-card.liquid       Grid card (+ quick add, wishlist)
│   ├── product-form.liquid       ATC form with quantity picker
│   ├── product-media-gallery.liquid  PDP gallery with thumbs + zoom
│   ├── product-recommendations.liquid  Drop-in recommended grid
│   ├── product-variant-picker.liquid   Swatches + pills
│   ├── recently-viewed.liquid
│   └── responsive-image.liquid   Canonical `<img>` with srcset, lazy,
│                                 decoding=async, placeholder SVG
├── templates/
│   ├── 404.json
│   ├── article.json
│   ├── blog.json
│   ├── cart.json
│   ├── collection.json
│   ├── customers/                7 account templates
│   │   ├── account.liquid
│   │   ├── activate_account.liquid
│   │   ├── addresses.liquid
│   │   ├── login.liquid
│   │   ├── order.liquid
│   │   ├── register.liquid
│   │   └── reset_password.liquid
│   ├── index.json                Orlaven homepage composition
│   ├── page.about.json
│   ├── page.contact.json
│   ├── page.faq.json
│   ├── page.json
│   ├── page.privacy.json
│   ├── page.shipping-returns.json
│   ├── page.size-guide.json
│   ├── page.terms.json
│   ├── product.json
│   └── search.json
├── sample-data/                 Demo data (NOT included in Shopify ZIP)
│   ├── collections.csv           11 collection rows
│   ├── images.md                 Unsplash credits + replacement advice
│   └── products.csv              15 products, 170 variants, 195 total rows
├── scripts/
│   ├── check-csv.js              CSV sanity checker
│   ├── gen-products-csv.js       Regenerates products.csv
│   └── validate-theme.js         JSON + structural + locale validator
├── .gitignore
└── README.md
```

> `scripts/`, `sample-data/`, `.agents/`, `.git/`, `.gitignore`, and `README.md` are delivery extras and **must not** be part of the Shopify upload bundle. The ZIP command below excludes all of them.

## Install - Option 1: ZIP upload

From the repo root, build the upload bundle with only the seven Shopify-required folders:

```sh
zip -r orlaven-theme.zip \
  assets \
  config \
  layout \
  locales \
  sections \
  snippets \
  templates \
  -x '*.DS_Store'
```

Then in the Shopify Admin:

1. Go to **Online Store -> Themes**.
2. Under **Theme library**, click **Add theme -> Upload ZIP file**.
3. Pick `orlaven-theme.zip` and wait for the upload to finish.
4. Click **Customize** to open the theme editor.
5. Click **Actions -> Publish** when you are ready to go live.

## Install - Option 2: GitHub integration

1. In Shopify Admin go to **Online Store -> Themes -> Add theme -> Connect from GitHub**.
2. Authorise the Shopify GitHub app and pick this repository.
3. Choose the branch to track (typically `main`).
4. Shopify will sync the theme automatically on every push. The non-theme folders (`sample-data/`, `scripts/`, `.agents/`) are ignored by Shopify because they are not one of the seven recognized theme folders.

## Install - Option 3: Shopify CLI

If you have [Shopify CLI](https://shopify.dev/docs/themes/tools/cli/install) installed and a development store connected:

```sh
shopify theme dev --store your-store.myshopify.com
```

## Required Shopify apps

These apps are referenced by optional sections of the theme. The theme will render safely without them, but installing them unlocks the matching behaviour:

### Judge.me Product Reviews

- Install from [apps.shopify.com/judgeme](https://apps.shopify.com/judgeme).
- After install, run Judge.me's app block injection so it mounts inside the product page's `reviews` block on `main-product`.
- The theme's `reviews-ugc` section renders its own UGC grid; Judge.me review stars appear on the product card via Judge.me's widget script.

### Klaviyo

- Install from [apps.shopify.com/klaviyo-email-marketing](https://apps.shopify.com/klaviyo-email-marketing).
- In Klaviyo, create a Shopify sync and a newsletter list. Copy the newsletter list ID.
- Replace the `{% form 'customer' %}` target in `sections/newsletter.liquid` and `layout/password.liquid` if you want to POST directly to Klaviyo instead of using Shopify's customer form. By default the theme uses the native Shopify customer form, which syncs to Klaviyo automatically when the Klaviyo Shopify integration is enabled.

### Instafeed

- Install from [apps.shopify.com/instafeed](https://apps.shopify.com/instafeed).
- The `sections/instagram-feed.liquid` section renders a grid of tiles you can populate manually. To switch to an Instafeed app block, remove the static blocks from the section and drop the Instafeed app block into the `instagram` section slot from the theme editor.

### Searchanise Search & Discovery

- Install from [apps.shopify.com/searchanise](https://apps.shopify.com/searchanise).
- Searchanise can replace the built-in predictive search controller by injecting its own script. To disable the theme's predictive search, toggle **Theme settings -> Search -> Enable predictive search** off. The predictive search snippet still exists but the `<predictive-search>` custom element only hydrates when that setting is on.

## Customization guide

Almost every customization lives in one of three places:

- **Theme editor UI**: global controls declared in [`config/settings_schema.json`](./config/settings_schema.json).
- **Translations**: every user-facing string keyed in [`locales/en.default.json`](./locales/en.default.json).
- **CSS tokens**: custom properties defined on `:root` in `layout/theme.liquid` from theme settings.

### Global theme settings

| Setting group | Key(s) | Effect | File that reads it |
|---|---|---|---|
| Logo | `logo`, `logo_width`, `favicon` | Header logo + favicon | `sections/header.liquid`, `layout/theme.liquid` |
| Brand palette | `color_espresso`, `color_cognac`, `color_cream`, `color_ink`, `color_beige` | Primary brand colors | `layout/theme.liquid` CSS vars, every section via `var(--color-*)` |
| Page colors | `color_background`, `color_text`, `color_accent`, `color_button`, `color_button_text` | Page-level colors | `layout/theme.liquid`, `assets/base.css` |
| Typography | `type_header_font`, `header_scale`, `type_body_font`, `body_scale` | Font faces + scale | `layout/theme.liquid` (uses `font_face` filter) |
| Layout | `page_width`, `spacing_sections` | Max container width, spacing between template sections | `assets/base.css` via `--page-width`, `--spacing-sections` |
| Buttons | `button_radius`, `border_width` | Button corner radius + default border | `assets/base.css` `.btn` |
| Cards | `card_style`, `card_radius` | Product card style (text / standard / card) | `snippets/product-card.liquid` |
| Social | `social_instagram_link`, `social_facebook_link`, `social_pinterest_link`, `social_tiktok_link`, `social_youtube_link` | Social icon row targets | `sections/footer.liquid`, `layout/password.liquid` |
| Currency | `currency_code_enabled` | Toggles currency code display | `snippets/price.liquid` |
| Cart | `cart_type`, `show_cart_note`, `enable_free_shipping_bar`, `free_shipping_threshold` | Drawer vs page, free-shipping bar | `sections/header.liquid`, `sections/cart-drawer.liquid`, `sections/main-cart.liquid`, `snippets/free-shipping-bar.liquid` |
| Search | `predictive_search_enabled` | Shows predictive search UI | `sections/header.liquid`, `snippets/predictive-search.liquid` |
| Product badges | `sale_badge_color`, `new_badge_color`, `sold_out_badge_color` | Badge colors | `snippets/product-card.liquid`, `layout/theme.liquid` |
| SEO | `organization_name`, `social_sharing_image` | OpenGraph + JSON-LD brand name | `layout/theme.liquid`, `snippets/json-ld.liquid` |
| Password page | `password_background_image` | Optional full-bleed backdrop behind the password gate | `layout/password.liquid` |

### Notable per-section settings

Most sections have 5-20 of their own settings. Open a section's `{% schema %}` block to see them. A few high-value ones:

- `sections/hero.liquid` - slide count, per-slide media + CTA, text alignment, dim overlay opacity.
- `sections/featured-collection.liquid` - per-homepage product carousel, choose a collection + grid size.
- `sections/shop-by-category.liquid` / `shop-by-style.liquid` - tile blocks with image + link.
- `sections/lookbook.liquid` - image + hotspot blocks with product linking.
- `sections/faq.liquid` - grouped accordion with emitted Schema.org FAQPage JSON-LD.
- `sections/size-guide.liquid` - tabbed tables with both inch and centimeter rows.
- `sections/contact-form.liquid` - subject dropdown blocks, address richtext, map embed URL.

## Metafield setup

The theme reads a small number of product and variant metafields. To light them up, open **Shopify Admin -> Settings -> Custom data -> Products** (or **Variants**) and create:

### Product metafields (namespace `custom`)

| Key | Type | Purpose | Read by |
|---|---|---|---|
| `material` | Single line text | Shows on the PDP "Craft" block, e.g. "Full-grain Italian leather" | `sections/main-product.liquid` |
| `fit` | Single line text | Shows in the fit callout next to sizing | `sections/main-product.liquid`, `snippets/product-variant-picker.liquid` |
| `care` | Multi-line text | Care instructions bullet list | `sections/main-product.liquid` |

### Variant metafields (namespace `custom`)

| Key | Type | Purpose | Read by |
|---|---|---|---|
| `swatch_color` | Color | Overrides the computed swatch background on variant pills | `snippets/product-variant-picker.liquid` |

After creating a metafield definition:

1. Enable **Storefronts** access on the definition so the theme can read it via Liquid.
2. Populate the values on each product (or variant) from its admin detail page.
3. Re-open the theme editor - the PDP will reflect the new values immediately.

## Running the validator

A Node 22 script (`scripts/validate-theme.js`) performs the following checks:

1. All seven required directories exist.
2. All required files exist (`layout/theme.liquid`, `layout/password.liquid`, `config/settings_schema.json`, `config/settings_data.json`, `locales/en.default.json`).
3. Every `.json` file under `/config`, `/locales` and `/templates` parses as valid JSON.
4. Every `.liquid` file has balanced `{% %}` and `{{ }}` delimiters.
5. Every `{% schema %}` block in a section file contains valid JSON.
6. Every `sections[id].type` in a JSON template resolves to a real file under `/sections/<type>.liquid` (hard failure if missing).
7. `layout/theme.liquid` includes the `skip-to-content-link`, loads `base.css` via `asset_url`, and loads `global.js` via `asset_url` (hard failure if any are missing).
8. Every `'key' | t` translation key in a `.liquid` file resolves to an entry in `locales/en.default.json` (**warning** only - sections may fall back via `| default:`).

Run:

```sh
node scripts/validate-theme.js
```

Exit code `0` means the theme is safe to upload. Exit code `1` prints each failure with file path and line/column when possible. Warnings are printed but do not fail the run.

## Demo content import order

To set up a fresh store with the demo Orlaven catalog:

1. **Upload the theme** (see "Install" above) but do not publish yet.
2. **Import collections** - Shopify Admin -> **Products -> Collections -> Import** and upload `sample-data/collections.csv`. Eleven collections will be created.
3. **Import products** - Shopify Admin -> **Products -> All products -> Import** and upload `sample-data/products.csv`. 15 products with 170 variants and ~24 image rows will be imported. Image fetching from Unsplash takes 1-3 minutes.
4. **Review the import report** in the email Shopify sends and fix any warnings.
5. **Upload theme settings images** - open the theme editor and set logo, favicon, hero slides, lookbook tiles, brand-story poster, newsletter background, and password-page background using your own imagery or stock photos from `sample-data/images.md`.
6. **Assign collections to menus** - Shopify Admin -> **Online Store -> Navigation** - link `Main menu` entries to the newly created collections (`New Arrivals`, `Jackets`, `Outerwear`, `Accessories`, etc.).
7. **Publish the theme** - Themes -> **Actions -> Publish**.

## Development

- The theme has **no build step**. Edit Liquid, CSS or JS files directly and reload the theme in Shopify.
- Use `shopify theme dev` for live-reloading local development against a dev store.
- Run `node scripts/validate-theme.js` after any structural change (new section, new template, renamed file).
- Regenerate sample data with `node scripts/gen-products-csv.js`. Commit the regenerated `sample-data/products.csv`.
- Sanity-check the CSV with `node scripts/check-csv.js sample-data/products.csv`.

### Adding a new section

1. Create `sections/<name>.liquid` with your markup.
2. End the file with a `{% schema %}` block declaring `name`, `settings`, optional `blocks`, optional `presets`, and `enabled_on` / `disabled_on` if the section is template-specific.
3. Run `node scripts/validate-theme.js` to confirm the schema JSON parses and the file is wired correctly.
4. To wire the section into an existing JSON template, add it under that template's `sections` and `order` keys.

### Adding a new translation key

1. Add the key to `locales/en.default.json` under the appropriate namespace (`general`, `sections`, `products`, `customer`, etc.).
2. Use it in Liquid via `{{ 'my.new.key' | t }}` or `{{ 'my.new.key' | t | default: 'Fallback copy' }}`.
3. Re-run the validator - unresolved keys appear as warnings.

## Performance

Practices the theme follows:

- **Lazy loading**: every non-hero `<img>` sets `loading="lazy"` and `decoding="async"`. The first hero image per page uses `loading="eager"` and `fetchpriority="high"`.
- **Responsive images**: `snippets/responsive-image.liquid` generates a nine-width `srcset` from Shopify's `image_url` filter and sets explicit `width`/`height` attributes to prevent CLS.
- **Font preloading**: Google Fonts is preconnected and loaded with `display=swap` so FOIT is avoided.
- **No jQuery, no bundler**: all JS is vanilla ES modules, loaded with `defer` and scoped to custom elements that upgrade only when their tag appears in the DOM.
- **Deferred media**: `brand-story` and similar sections use a `<deferred-media>` custom element that only instantiates the `<iframe>` / `<video>` after the user clicks play.
- **Section Rendering API**: cart updates repaint only the `cart-drawer` section, not the full page.
- **CSS custom properties**: a single `:root` block on `layout/theme.liquid` provides every token, so no inline style overrides per element.

## Accessibility

- Skip-to-content link is the first focusable element on every page (`layout/theme.liquid`, `layout/password.liquid`).
- Every `<button>` declares `type="button"` or `type="submit"` - no implicit form submits.
- Every `<img>` has an `alt` attribute. Decorative images set `alt=""`.
- Color contrast on the default palette exceeds WCAG AA (espresso `#2B1F17` on cream `#F5EFE6` is 12.7:1).
- Interactive custom elements (`<summary-details>`, `<local-tabs>`, `<modal-dialog>`, `<cart-drawer>`, `<predictive-search>`) manage focus on open/close and handle Escape, Tab, Arrow and Home/End keys.
- Form error blocks set `role="alert" tabindex="-1"` and autofocus on failed submit so screen readers announce them.
- `aria-invalid` is applied to form fields listed in `form.errors`.
- `aria-live="polite"` regions exist on cart line updates and predictive search results.

## Credits

- Fonts: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter), both via [Google Fonts](https://fonts.google.com).
- Demo photography: [Unsplash](https://unsplash.com) photographers, credited individually in `sample-data/images.md`.
- Conventions and some architectural ideas inspired by Shopify's open-source [Dawn](https://github.com/Shopify/dawn) reference theme, though no Dawn source is vendored here - all markup, styles, and JavaScript are original to Orlaven.
- Built and delivered for Orlaven.
