# Orlaven — Store Setup Guide

Step-by-step from a fresh Shopify store to a launch-ready Orlaven site.

## 1. Install the theme

**Option A — Shopify CLI (recommended for ongoing dev):**
```bash
npm install -g @shopify/cli @shopify/theme
shopify theme dev --store=orlaven.myshopify.com
# visit the printed preview URL
```

**Option B — Zip upload:**
```bash
zip -r orlaven-theme.zip . -x ".git/*" "*.DS_Store" "docs/*" "README.md" "BRAND.md"
# Admin → Online Store → Themes → Add theme → Upload zip
```

## 2. Configure navigation

Navigation → Add menu:
- **`main-menu`** (used in header)
  - Men → /collections/men
    - Biker → /collections/biker
    - Bomber → /collections/bomber
    - Cafe Racer → /collections/cafe-racer
    - Aviator → /collections/aviator
  - Women → /collections/women (same children)
  - Custom → /pages/custom
  - Journal → /blogs/news
  - About → /pages/about
- **`footer`** (used in footer)
  - Shop / Help / About columns

## 3. Create collections

Automated (smart) collections:
- `new-arrivals` — condition: created in last 30 days
- `best-sellers` — condition: sales > N, or curate manually
- `sale` — condition: compare_at_price > price

Manual / category collections:
- `men`, `women`
- `biker`, `bomber`, `aviator`, `cafe-racer`, `shearling`, `suede`
- `cow`, `lamb` (material collections)

Each collection: set a banner image (shows as hero on the collection page).

## 4. Define metafields

See `docs/METAFIELDS.md`. Create them all in **Settings → Custom data**.

## 5. Enable Shopify native filtering

Apps → Add **Search & Discovery** (free, by Shopify) → Filters tab → create filters:
- Product availability (standard)
- Price (standard)
- Color (from product option)
- Size (from product option)
- Leather type (from `specs.leather_type` metafield)

The collection grid (`main-collection-product-grid`) automatically renders whatever filters you configure here — no code changes needed.

## 6. Enable Shopify Markets

Settings → Markets → activate your target regions.
The footer currency / country selectors will start to populate automatically.

## 7. Email capture

The newsletter form uses Shopify's native `customer` form and tags subscribers with `newsletter`.

If using Klaviyo: replace the `{% form 'customer' %}` block in `sections/newsletter.liquid` and `sections/footer.liquid` with your Klaviyo embed code, or sync via Klaviyo → Integrations → Shopify.

## 8. Configure Theme Editor content

Online Store → Themes → Customize.

**Theme settings:**
- Upload logo
- Upload favicon
- Tune palette + fonts (Heritage preset is the default)

**Homepage:**
- Hero → upload a 1600×900 MP4 (or image) with a strong subject + negative space bottom-left
- Shop by category tiles → assign collections to each
- Featured collection → pick `new-arrivals` and `best-sellers`
- Shop by style tiles → upload cropped 3:4 images per style
- Custom banner → upload atelier photo, confirm the 4 steps
- Lookbook → upload 2 editorial images (wide + narrow)
- Craftsmanship video → upload atelier loop (muted, 15–30s)
- Material guide → one image per leather type
- Reviews → fill 3 testimonials; UGC grid → 6 IG photos (or replace with Instafeed)
- Press logos → upload PNG logos of publications
- Newsletter → upload a moody bg image or set color-only band

## 9. Launch checklist

- [ ] `/` loads with every section populated
- [ ] `/products/<any-handle>` shows gallery, all buy-box blocks, Add to Bag works
- [ ] `/collections/all` shows grid + filters + pagination
- [ ] `/cart` and cart drawer both work (open drawer → remove a line)
- [ ] `/search?q=leather` returns results
- [ ] `/account/login` → `/account/register` → order flow
- [ ] `/blogs/news` and an individual article render
- [ ] `/404` page works (visit any bad URL)
- [ ] SEO: `/` → view source → confirm `og:*`, JSON-LD (on PDPs), canonical URL
- [ ] Run Lighthouse on `/` → target ≥ 90 Performance on mobile
- [ ] Set up a password page → flip to "Enable password page" for pre-launch
- [ ] Payment methods: Shop Pay, major cards, Klarna/Afterpay if applicable

## 10. Day-2 operations

- **Add a new product:** upload ≥ 4 images (3:4 preferred), fill metafields, assign to its style collection + `best-sellers` if curated.
- **Add an announcement message:** Theme editor → Announcement bar → Add message → publish.
- **Change the hero seasonally:** Theme editor → Hero → swap video/image + copy. No code change.
- **New editorial tile:** Lookbook section → Add tile block.
- **New shop-by-style chip:** Shop by style → Add style block.
