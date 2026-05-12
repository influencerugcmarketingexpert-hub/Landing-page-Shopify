# Orlaven — Brand Guide

Premium handcrafted leather jackets and outerwear. Heritage craftsmanship with DTC warmth.

> **Tagline:** Worn in. Built to last.

## Voice

- **Confident, not loud.** Short sentences. Concrete nouns (lamb, cow, shearling, brass, waxed cotton).
- **Unpretentious luxury.** Never say "luxurious". Show it.
- **Craft-first.** When in doubt, name the person or the process.
- **Zero exclamation marks.** Zero emoji. Zero superlatives.

### Words we use
- atelier, hide, patina, small batches, edit, circle, the range, full-grain
- worn in, broken in, run-in, built to last
- handcrafted, hand-stitched, hand-finished

### Words we avoid
- premium, luxurious, exclusive, unique, amazing, stunning, iconic, curated
- timeless (unless you can name the year), essential, must-have

## Copy length rules

| Element            | Target                  |
| ------------------ | ----------------------- |
| Eyebrow            | 2–3 words               |
| H1 (hero)          | ≤ 6 words               |
| Hero sub           | ≤ 14 words              |
| Section heading    | ≤ 6 words               |
| Section sub        | ≤ 20 words              |
| Product name       | 2–3 words               |
| Product description| 60–90 words             |
| Button             | 2–3 words               |

## Visual identity

### Palette (light — "Heritage")
| Token                | Hex      | Use                          |
| -------------------- | -------- | ---------------------------- |
| `--color-bg`         | `#FAF7F2`| Page background              |
| `--color-surface`    | `#FFFFFF`| Cards, surfaces              |
| `--color-ink`        | `#1A1613`| Body text, buttons           |
| `--color-muted`      | `#5C524A`| Secondary text, meta         |
| `--color-accent`     | `#8B5E3C`| CTAs-on-hover, links         |
| `--color-border`     | `#E7E1D8`| Dividers, inputs             |
| `--color-sale`       | `#A43B2B`| Sale pricing only            |

### Palette (dark — "Noir")
| Token                | Hex      |
| -------------------- | -------- |
| `--color-bg`         | `#141110`|
| `--color-surface`    | `#1E1A17`|
| `--color-ink`        | `#F2ECE3`|
| `--color-muted`      | `#B6AA9A`|
| `--color-accent`     | `#C79B6D`|
| `--color-border`     | `#2A2522`|

### Typography
- **Heading:** Playfair Display (400 weight). Serif with contrast. For hero headings and section titles.
- **Body:** Inter (400 / 500 / 600). Neutral, technical, pairs quietly.
- Eyebrows are uppercase Inter, `letter-spacing: .18em`, `font-size: .75rem`.

### Logo
- Wordmark set in Playfair Display, tracked to `.08em`.
- Minimum 24px height. Always use full wordmark — no letter-only lockup.

## Photography direction

- **Hero:** 35mm film look. Natural light, overcast or golden hour. Subject in mid-action (walking, hands in pockets). Never straight-to-camera smiling.
- **Product:** Shot on matte stone, unbleached linen, or weathered wood. Studio light but soft — leather should show grain.
- **Editorial:** Cinematic crops (2.39:1 on desktop, square on mobile). Allow text to breathe in bottom-left.
- **UGC:** Encourage wrinkled collars, rain, travel imagery. Never retouched.

## Motion

- Hover: `transform: scale(1.03)` over 400–600ms ease.
- Reveal on scroll: 10% threshold, single 400ms fade + 12px translate.
- Hero slider: 6s interval, 600ms cross-fade.
- Respect `prefers-reduced-motion`.

## Don'ts

- Don't put a sale price next to a testimonial.
- Don't put discounts on hero. Let the category tiles carry urgency.
- Don't use stock photography of the product. Only the product we actually make.
- Don't use lifestyle photos on the PDP — keep it on category, hero, editorial, UGC.
