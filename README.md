# Orlaven — Shopify Theme

A full-stack **Shopify Online Store 2.0** theme for Orlaven, a premium handcrafted-leather-jackets brand.
Built as a sections-everywhere, JSON-templated theme with a heritage-lux design language synthesized from 12 benchmark sites (Inland Leather, Prada, Overland, Thursday Boots, The Jacket Maker, AllSaints, RevZilla, Alpinestars, and others).

**Tagline:** Worn in. Built to last.

---

## Architecture

```
.
├── assets/
│   ├── base.css            # Complete design system (~1,500 lines)
│   └── theme.js            # All interactive behavior (~420 lines)
├── config/
│   ├── settings_data.json  # Default theme settings values + presets
│   └── settings_schema.json# Theme editor schema (colors, fonts, layout)
├── layout/
│   ├── theme.liquid        # Main layout — wraps every page
│   └── password.liquid     # Pre-launch password page
├── locales/
│   ├── en.default.json     # Storefront strings (EN, default)
│   └── en.default.schema.json
├── sections/               # 40+ sections, all with {% schema %} + presets
├── snippets/               # Reusable partials (product-card, price, icons, etc.)
└── templates/              # JSON route templates
    ├── index.json          # Homepage — full 15-section skeleton
    ├── product.json        # PDP with blocks, related products, size guide
    ├── collection.json     # Banner + product grid + filters
    ├── cart.json
    ├── search.json
    ├── blog.json
    ├── article.json
    ├── page.json, page.contact.json
    ├── 404.json
    ├── list-collections.json
    ├── password.json
    ├── gift_card.liquid
    └── customers/
        ├── account.json, login.json, register.json, order.json,
        ├── addresses.json, activate_account.json, reset_password.json
```

## Homepage skeleton (templates/index.json)

In order, reorderable from the theme editor:

1. **Announcement bar** — rotating messages (shipping, returns, craft)
2. **Header** — sticky, mega menu, search overlay, cart drawer
3. **Hero** — full-bleed video or slideshow (Prada / AllSaints cinematic)
4. **Trust strip** — shipping / returns / craftsmanship / rating
5. **Shop by category** — 6 tiles (Men, Women, Biker, Bomber, Aviator, Shearling)
6. **New arrivals** — horizontal carousel
7. **Shop by style** — scrollable chip gallery (Biker, Bomber, Cafe Racer, Aviator, Shearling, Suede)
8. **Custom jacket banner** — 4-step "Design your own" funnel (Trendy Jacket / The Jacket Maker play)
9. **Best sellers** — carousel
10. **Lookbook** — asymmetric editorial tiles
11. **Craftsmanship video** — full-bleed muted autoplay
12. **Material guide** — 3-col leather education
13. **Reviews + UGC** — aggregate + testimonials + Instagram grid
14. **Press logos** — "As seen in"
15. **Journal preview** — 3 latest blog posts
16. **Instagram feed** — 6-col grid
17. **Newsletter** — 10% off banner
18. **Footer** — 4-col with newsletter + localization + payment types

## Sections

All sections expose blocks and presets and are **100% editable from Theme Editor**.
Every section uses design tokens (no hard-coded colors) so the Heritage / Noir palette swaps from a single setting.

### Global
| Section                   | Notes                                                 |
| ------------------------- | ----------------------------------------------------- |
| `announcement-bar`        | Rotating, icon + link per message, autoplay interval. |
| `header`                  | Sticky / transparent variants, mega menu with feature image, search overlay, mobile drawer. |
| `footer`                  | Menu / text / newsletter blocks, social icons, currency + country selectors, payment type SVGs. |

### Homepage
`hero`, `trust-strip`, `shop-by-category`, `featured-collection` (New / Best), `shop-by-style`, `custom-jacket-banner`, `lookbook`, `craftsmanship-video`, `material-guide`, `reviews-ugc`, `press-logos`, `blog-preview`, `instagram-feed`, `newsletter`.

### Commerce templates
| Section                             | Template       |
| ----------------------------------- | -------------- |
| `main-product`                      | product.json   |
| `main-collection-banner`            | collection.json|
| `main-collection-product-grid`      | collection.json|
| `main-cart`                         | cart.json      |
| `main-search`                       | search.json    |
| `main-blog`                         | blog.json      |
| `main-article`                      | article.json   |
| `main-page`                         | page.json      |
| `main-account`, `main-order`, `main-addresses`, `main-login`, `main-register`, `main-activate-account`, `main-reset-password` | customers/*.json |
| `main-list-collections`             | list-collections.json |
| `main-404`                          | 404.json       |
| `main-password`                     | password.json  |
| `size-guide`                        | Modal, included on product.json |
| `related-products`                  | Uses Shopify `recommendations.products`, fallback to `collections.all` |
| `predictive-search`                 | Wrapped snippet for `/search/suggest` endpoint |

## Metafields

Expected definitions (create in **Shopify Admin → Settings → Custom data → Products**):

| Namespace.key              | Type            | Purpose                                     |
| -------------------------- | --------------- | ------------------------------------------- |
| `specs.leather_type`       | Single-line text| "Full-grain cow", "Lambskin", "Shearling"…  |
| `specs.lining`             | Single-line text| Viscose, cupro, wool…                       |
| `specs.closure`            | Single-line text| YKK #5 brass zip, button placket…           |
| `specs.fit`                | Single-line text| Slim, regular, oversized                    |
| `specs.origin`             | Single-line text| "Handcrafted in Florence"                   |
| `specs.ce_rating`          | Single-line text| "CE AA" for moto products                   |
| `specs.care`               | Rich text       | Care instructions (overrides fallback)      |
| `reviews.rating`           | Number decimal  | Written by your reviews app (Judge.me/Loox) |
| `reviews.rating_count`     | Integer         | Count written by reviews app                |

Article reading time (optional):
| `article.reading_time`     | Integer         | Rendered in journal preview cards           |

## Product options → swatches

The product card and PDP auto-detect a `Color` (or `Colour`) option and render it as CSS color swatches.
For non-named colors, add a metafield `options.color_hex` on the product if you want precise hex values (next iteration).

## Internationalization & currency

- `localization` form in footer lets customers switch currency + country (uses **Shopify Markets**).
- All currency-displaying templates use the `money` filter — no hard-coded `$`.
- Locale strings live in `locales/en.default.json`; copy + translate to add languages.

## SEO

- JSON-LD `Product` structured data emitted on PDPs (schema.org Product + Offer + AggregateRating).
- OpenGraph + Twitter cards emitted for every page via `snippets/meta-tags.liquid`.
- Canonical URL + pagination-aware `<title>` in layout.

## Performance

- Responsive images via `image_tag` with `widths` / `sizes` on every render.
- Fonts loaded via Shopify `font_face` filter with `font_display: swap`.
- `defer` on theme.js. No blocking scripts.
- Cart updates use section rendering (`/cart?section_id=cart-drawer`) — no full-page reload.
- `IntersectionObserver` scroll reveal is enhancement-only.

## Apps (recommended, not required)

| Need              | App            |
| ----------------- | -------------- |
| Reviews + UGC     | Judge.me, Loox |
| Email             | Klaviyo        |
| Predictive search | Searchanise (or use Shopify native `/search/suggest`) |
| Upsell            | Rebuy          |
| Instagram         | Instafeed      |
| Multi-currency    | Shopify Markets|

## Local setup

```bash
# From this directory, using Shopify CLI 3.x
shopify theme dev --store=orlaven.myshopify.com
```

Or upload as a zip:
```bash
zip -r orlaven-theme.zip . -x ".git/*"
# Then: Shopify admin → Online Store → Themes → Add theme → Upload zip
```

## Dev checklist for launch

- [ ] Create navigation: `main-menu` (Men, Women, Custom, Journal…) and `footer` menus
- [ ] Create collections: `new-arrivals`, `best-sellers`, `men`, `women`, `biker`, `bomber`, `aviator`, `cafe-racer`, `shearling`, `suede`
- [ ] Define the metafields table above
- [ ] Configure **Shopify Markets** (or currency selector will fall back gracefully)
- [ ] Enable **Search & Discovery** app for collection filtering
- [ ] Add Klaviyo newsletter form ID (or keep built-in `customer` tag form)
- [ ] Replace placeholder Instagram images with Instafeed (or keep hand-picked blocks)
- [ ] Upload brand hero video (1600×900 MP4 < 4 MB, or link via CDN)
- [ ] Set the Press logos block images
- [ ] Create a `/pages/custom` page for the Design-Your-Own funnel
- [ ] Create a `/pages/craftsmanship` page for the atelier story

## License

Proprietary — Orlaven. Do not distribute.
