# Orlaven — Metafield Definitions

Create these in **Shopify Admin → Settings → Custom data → Products (or Articles)**.

The theme reads them with graceful fallbacks: if a metafield is missing, the corresponding row / block is hidden (not broken).

---

## Products

### Namespace: `specs`
| Key            | Type                 | Example                       | Used on                |
| -------------- | -------------------- | ----------------------------- | ---------------------- |
| `leather_type` | Single-line text     | `Full-grain cow`              | PDP → Details block    |
| `lining`       | Single-line text     | `Viscose twill`               | PDP → Details block    |
| `closure`      | Single-line text     | `YKK #5 brass zip`            | PDP → Details block    |
| `fit`          | Single-line text     | `Slim, true to size`          | PDP → Details block    |
| `origin`       | Single-line text     | `Handcrafted in Florence`     | PDP → Details block    |
| `ce_rating`    | Single-line text     | `CE AA` (moto products)       | PDP → Details block    |
| `care`         | Rich text            | Care instructions             | PDP → Care block       |

### Namespace: `reviews` (written by your reviews app)
| Key            | Type            | Source          |
| -------------- | --------------- | --------------- |
| `rating`       | Decimal number  | Judge.me / Loox |
| `rating_count` | Integer         | Judge.me / Loox |

---

## Articles

### Namespace: `article`
| Key            | Type     | Used on                  |
| -------------- | -------- | ------------------------ |
| `reading_time` | Integer  | Journal preview cards    |

---

## Pages (optional, for custom landing pages)

If you want editor-configurable hero/content for specific pages, add a Custom-page template and reuse existing sections via JSON templates (`templates/page.custom.json`, `templates/page.craftsmanship.json`, etc.).
