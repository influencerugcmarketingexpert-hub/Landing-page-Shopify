# Orlaven Shopify Theme

A Shopify Online Store 2.0 theme built from the ground up for Orlaven, a premium handcrafted leather jackets brand. The theme is written as plain Liquid, HTML, CSS and vanilla JavaScript, with no build step, so it can be uploaded straight to any Shopify store as a ZIP or connected through the GitHub integration.

## Overview

- Shopify Online Store 2.0 (JSON templates + sections everywhere)
- 19 editable homepage sections covering a typical fashion-ecommerce layout
- Fully translatable via `locales/en.default.json`
- CSS driven by design tokens declared from theme settings
- Accessible: semantic landmarks, focus styles, skip-to-content link, aria labels
- Ships with a 15-product sample CSV (`sample-data/products.csv`) so a fresh store can be populated in minutes

## What is Orlaven

Orlaven is a small atelier brand that produces handcrafted full-grain leather jackets in limited runs. Product storytelling on the theme leans into craft (materials, makers, lifetime repairs) rather than heavy discounting.

The default brand tokens shipped with the theme are:

| Token                | Value     |
| -------------------- | --------- |
| `--color-espresso`   | `#2B1F17` |
| `--color-cognac`     | `#9A5A3C` |
| `--color-cream`      | `#F5EFE6` |
| `--color-ink`        | `#0F0F0F` |
| `--color-beige`      | `#E8DFD2` |
| Heading font         | Cormorant Garamond |
| Body font            | Inter     |

## Folder structure

```
.
├── assets/                  Theme CSS, JS, icons, images
├── config/
│   ├── settings_schema.json Theme editor controls
│   └── settings_data.json   Pre-filled Orlaven defaults + preset
├── layout/
│   ├── theme.liquid         Global shell (CSS vars from settings, header/footer)
│   └── password.liquid      Password-gate shell
├── locales/
│   └── en.default.json      Full English string table
├── sections/                Reusable sections (header, footer, hero, etc.)
├── snippets/                Atoms (product-card, price, icons, meta tags)
├── templates/               JSON + Liquid templates
│   └── customers/           Account pages
├── sample-data/             15-product import CSV + reference imagery list
├── scripts/
│   └── validate-theme.js    Local JSON + structural validator
├── .gitignore
└── README.md
```

> `scripts/`, `sample-data/`, `.agents/` and `.gitignore` are delivery extras and are **not** part of the Shopify upload bundle.

## Install

### Option 1 - Admin ZIP upload (fastest)

From the repo root, build the upload bundle:

```sh
zip -r orlaven-theme.zip . \
  -x ".git/*" \
  -x ".agents/*" \
  -x "sample-data/*" \
  -x "scripts/*" \
  -x "*.md" \
  -x ".gitignore"
```

Then in the Shopify Admin:

1. Go to **Online Store -> Themes**.
2. Under **Theme library**, click **Add theme -> Upload ZIP file**.
3. Pick `orlaven-theme.zip` and wait for the upload to finish.
4. Click **Customize** to open the theme editor.

### Option 2 - GitHub integration

1. In Shopify Admin go to **Online Store -> Themes -> Add theme -> Connect from GitHub**.
2. Authorise the Shopify GitHub app and pick this repository.
3. Choose the branch to track (typically `main`).
4. Shopify will sync the theme automatically on every push.

### Option 3 - Shopify CLI (local dev)

If you have [Shopify CLI](https://shopify.dev/docs/themes/tools/cli/install) installed and a development store connected:

```sh
shopify theme dev --store your-store.myshopify.com
```

## Required Shopify apps

These apps are referenced by optional sections of the theme. The theme will render safely without them, but installing them unlocks the matching sections:

- **[Judge.me Product Reviews](https://apps.shopify.com/judgeme)** - powers the reviews and user-generated-content section.
- **[Klaviyo](https://apps.shopify.com/klaviyo-email-marketing)** - newsletter collection and post-purchase flows.
- **[Instafeed](https://apps.shopify.com/instafeed)** - Instagram feed block on the homepage.
- **[Searchanise Search & Discovery](https://apps.shopify.com/searchanise)** - optional replacement for the built-in predictive search.

## Customisation guide

Almost every setting lives in one of two places:

- **Theme editor UI**: global controls declared in [`config/settings_schema.json`](./config/settings_schema.json). Update colours, fonts, logo, layout widths, social URLs, cart behaviour, badge colours and SEO from the **Theme settings** panel. Defaults for the Orlaven brand are in [`config/settings_data.json`](./config/settings_data.json).
- **Translations**: every user-facing string in the theme is keyed in [`locales/en.default.json`](./locales/en.default.json). Rename the file to `es.json`, `fr.json`, etc., translate the values, and Shopify will pick up the new locale automatically.

The global design tokens are exposed as CSS custom properties in `layout/theme.liquid` (e.g. `--color-espresso`, `--font-heading`, `--page-width`). Any section stylesheet can reference them with `var(...)`.

## Running the validator

A small Node 22 script checks that every JSON file parses, that required folders and files exist, and that Liquid delimiters are balanced in every `.liquid` file.

```sh
node scripts/validate-theme.js
```

Exit code 0 means the theme is safe to upload. Exit code 1 prints each problem with file path and line/column when possible.

## Demo content import

The `sample-data/` directory ships with 15 demo leather jackets in the Shopify Products CSV format.

1. In Shopify Admin open **Products -> All products**.
2. Click **Import** and upload `sample-data/products.csv`.
3. When import finishes, re-open the theme editor to see the demo catalogue populating collection and homepage sections.

Image URLs in the CSV point to royalty-free Unsplash photos so the demo store looks complete even before you add real product photography.

## Credits

Designed and built for Orlaven by the in-house theme team. Fonts: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter) from Google Fonts. Demo photography via Unsplash under the Unsplash licence.
