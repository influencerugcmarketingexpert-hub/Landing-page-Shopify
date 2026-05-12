#!/usr/bin/env node
/**
 * One-shot generator for sample-data/products.csv.
 *
 * This script is intentionally a development utility and is NOT part of
 * the theme bundle. It is kept in /scripts for reproducibility so the
 * product CSV can be regenerated if we want to swap photography or
 * rebalance prices. Run it with:
 *
 *   node scripts/gen-products-csv.js
 *
 * and commit the resulting sample-data/products.csv.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'sample-data', 'products.csv');

const HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
];

// 20 royalty-free Unsplash photo IDs of jackets / outerwear / leather
// product photography. Every URL resolves to a real publicly hosted
// Unsplash image; these are documented in sample-data/images.md with
// photographer credits. We cycle through them across products.
const UNSPLASH_IDS = [
  '1551028719-00167b16eac5',
  '1520975916090-3105956dac38',
  '1521572163474-6864f9cf17ab',
  '1514996937319-344454492b37',
  '1544022613-e87ca75a784a',
  '1558618666-fcd25c85cd64',
  '1551232864-3f0890e580d9',
  '1548883354-94bcfe321cbb',
  '1527719327859-c6ce80353573',
  '1516762689617-e1cffcef479d',
  '1591047139829-d91aecb6caea',
  '1562157873-818bc0726f68',
  '1542060748-10c28b62716f',
  '1543076447-215ad9ba6923',
  '1580657018950-c7f7d6a6d990',
  '1516257984-b1b4d707412e',
  '1550614000-4888a9ac4a51',
  '1578932750294-f5075e85f44a',
  '1520975661595-6453be3f7070',
  '1574180566232-aaad1b5b8450',
];

function unsplash(index) {
  const id = UNSPLASH_IDS[index % UNSPLASH_IDS.length];
  return `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;
}

// 15 products, carefully tuned so `best-sellers` and `new-arrivals`
// tags always resolve on the homepage after CSV import.
const PRODUCTS = [
  {
    handle: 'the-halston-biker',
    title: 'The Halston Biker',
    type: 'Biker Jacket',
    body:
      'A refined take on the classic biker. Full-grain Italian leather, asymmetric zip, and a hand-waxed finish that only deepens with wear.',
    tags: ['biker', 'full-grain-leather', 'best-sellers', 'new-arrivals', 'jackets', 'moto'],
    colors: ['Espresso', 'Black', 'Oxblood'],
    price: 1395,
    compareAt: 1495,
    grams: 1400,
    imageIdx: 0,
    images: 3,
  },
  {
    handle: 'the-ashford-bomber',
    title: 'The Ashford Bomber',
    type: 'Bomber Jacket',
    body:
      'Softly structured bomber in buttery lambskin. Ribbed collar, cuffs and hem; satin-lined body for a clean drape.',
    tags: ['bomber', 'lambskin', 'best-sellers', 'jackets'],
    colors: ['Cognac', 'Black'],
    price: 895,
    compareAt: null,
    grams: 950,
    imageIdx: 1,
    images: 3,
  },
  {
    handle: 'the-marlowe-cafe-racer',
    title: 'The Marlowe Cafe Racer',
    type: 'Cafe Racer',
    body:
      'Slim, minimal cafe racer cut from full-grain Horween leather. Snap stand collar and hand-painted edges.',
    tags: ['cafe-racer', 'full-grain-leather', 'new-arrivals', 'jackets', 'moto'],
    colors: ['Espresso', 'Black'],
    price: 1195,
    compareAt: null,
    grams: 1200,
    imageIdx: 2,
    images: 3,
  },
  {
    handle: 'the-kingsley-aviator',
    title: 'The Kingsley Aviator',
    type: 'Aviator Jacket',
    body:
      'Lined in natural shearling with a full-grain shell. Built for cold commutes and long winters.',
    tags: ['aviator', 'shearling', 'jackets', 'outerwear'],
    colors: ['Fawn', 'Espresso'],
    price: 2195,
    compareAt: 2395,
    grams: 2200,
    imageIdx: 3,
    images: 2,
  },
  {
    handle: 'the-hadley-shearling',
    title: 'The Hadley Shearling',
    type: 'Shearling Coat',
    body:
      'A statement shearling in Italian lambskin. Rolled collar, tortoiseshell buttons, mid-thigh cut.',
    tags: ['shearling', 'best-sellers', 'jackets', 'outerwear'],
    colors: ['Ivory', 'Fawn', 'Cognac'],
    price: 2495,
    compareAt: null,
    grams: 2400,
    imageIdx: 4,
    images: 3,
  },
  {
    handle: 'the-westbrook-moto',
    title: 'The Westbrook Moto',
    type: 'Moto Jacket',
    body:
      'Race-inspired moto with asymmetric zip, forearm zippers, and an anatomical sleeve bend. Full-grain cowhide.',
    tags: ['biker', 'full-grain-leather', 'moto', 'new-arrivals', 'jackets'],
    colors: ['Black', 'Espresso'],
    price: 1295,
    compareAt: null,
    grams: 1450,
    imageIdx: 5,
    images: 3,
  },
  {
    handle: 'the-camden-field-jacket',
    title: 'The Camden Field Jacket',
    type: 'Field Jacket',
    body:
      'A workwear silhouette in weatherproofed suede. Four utility pockets, drawcord waist, copper snaps.',
    tags: ['field', 'suede', 'jackets', 'outerwear'],
    colors: ['Fawn', 'Espresso'],
    price: 795,
    compareAt: null,
    grams: 1100,
    imageIdx: 6,
    images: 2,
  },
  {
    handle: 'the-ellis-leather-blazer',
    title: 'The Ellis Leather Blazer',
    type: 'Blazer',
    body:
      'Tailored blazer in soft lambskin. Two-button front, peak lapel, fully lined. Dress it up or throw it over denim.',
    tags: ['blazer', 'lambskin', 'new-arrivals', 'jackets'],
    colors: ['Ivory', 'Black'],
    price: 995,
    compareAt: null,
    grams: 1050,
    imageIdx: 7,
    images: 3,
  },
  {
    handle: 'the-thornton-trench',
    title: 'The Thornton Trench',
    type: 'Trench Coat',
    body:
      'Mid-calf leather trench with storm flap, epaulettes, and tie belt. Cut from oiled full-grain leather.',
    tags: ['trench', 'full-grain-leather', 'outerwear'],
    colors: ['Cognac', 'Espresso'],
    price: 1695,
    compareAt: null,
    grams: 2100,
    imageIdx: 8,
    images: 3,
  },
  {
    handle: 'the-bronson-chore-coat',
    title: 'The Bronson Chore Coat',
    type: 'Chore Coat',
    body:
      'A classic French chore coat reimagined in soft suede. Three patch pockets, triple-needle stitching.',
    tags: ['chore', 'suede', 'jackets'],
    colors: ['Fawn', 'Espresso'],
    price: 695,
    compareAt: null,
    grams: 950,
    imageIdx: 9,
    images: 2,
  },
  {
    handle: 'the-rhodes-racer-vest',
    title: 'The Rhodes Racer Vest',
    type: 'Vest',
    body:
      'A sleeveless racer in full-grain leather. Layer over knitwear, under a trench, wear solo on warmer days.',
    tags: ['vest', 'full-grain-leather', 'jackets'],
    colors: ['Black', 'Espresso'],
    price: 595,
    compareAt: null,
    grams: 700,
    imageIdx: 10,
    images: 2,
  },
  {
    handle: 'the-langley-shirt-jacket',
    title: 'The Langley Shirt Jacket',
    type: 'Shirt Jacket',
    body:
      'Shirt-weight lambskin overshirt with snap buttons and twin chest pockets. Packable, breathable, endlessly wearable.',
    tags: ['shirt-jacket', 'lambskin', 'new-arrivals', 'jackets'],
    colors: ['Cognac', 'Espresso', 'Black'],
    price: 795,
    compareAt: null,
    grams: 800,
    imageIdx: 11,
    images: 3,
  },
  {
    handle: 'the-pembroke-overcoat',
    title: 'The Pembroke Overcoat',
    type: 'Overcoat',
    body:
      'A long overcoat in a wool-leather blend. Leather shell, wool body panels, horn buttons, hand-padded collar.',
    tags: ['overcoat', 'wool-leather', 'outerwear'],
    colors: ['Espresso', 'Ink'],
    price: 1895,
    compareAt: 2095,
    grams: 2300,
    imageIdx: 12,
    images: 3,
  },
  {
    handle: 'the-whitaker-ranger',
    title: 'The Whitaker Ranger',
    type: 'Western Jacket',
    body:
      'Western-inspired suede ranger. Yoke detailing, pearlescent snaps, and a waxed finish for patina.',
    tags: ['western', 'suede', 'best-sellers', 'jackets'],
    colors: ['Fawn', 'Cognac'],
    price: 895,
    compareAt: null,
    grams: 1000,
    imageIdx: 13,
    images: 2,
  },
  {
    handle: 'the-cortland-weekender',
    title: 'The Cortland Weekender',
    type: 'Weekender',
    body:
      'A soft lambskin weekender bag to match the jackets. Full-grain handles, cotton canvas lining, brass hardware.',
    tags: ['weekender', 'lambskin', 'new-arrivals', 'accessories'],
    colors: ['Cognac', 'Espresso', 'Black'],
    price: 695,
    compareAt: null,
    grams: 1600,
    imageIdx: 14,
    images: 2,
  },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const COLOR_CODES = {
  Espresso: 'ESP',
  Cognac: 'COG',
  Black: 'BLK',
  Oxblood: 'OXB',
  Ivory: 'IVY',
  Fawn: 'FWN',
  Ink: 'INK',
};

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function emitRow(columns) {
  return columns.map(escapeCsv).join(',');
}

function buildSeo(product) {
  const title = `${product.title} | Handcrafted Leather | Orlaven`;
  const material = product.tags.find((t) => [
    'full-grain-leather',
    'lambskin',
    'suede',
    'shearling',
    'wool-leather',
  ].includes(t)) || 'full-grain-leather';
  const description = `${product.title}: ${material.replace(/-/g, ' ')} ${product.type.toLowerCase()} handcrafted by Orlaven. Sizes S to XXL. Free shipping over $200.`;
  return { title, description };
}

function emitProduct(product) {
  const rows = [];
  const seo = buildSeo(product);
  const tagsStr = product.tags.join(', ');
  const bodyHtml = `<p>${product.body}</p><ul><li>Handcrafted in our European atelier</li><li>Premium hardware and bonded-thread stitching</li><li>Lifetime repair guarantee</li></ul>`;
  let isFirst = true;
  let imageVariantCursor = 0;

  // Variant rows: Size x Color grid
  for (const color of product.colors) {
    for (const size of SIZES) {
      const sku = `ORL-${product.handle.toUpperCase().replace(/^THE-/, '').replace(/-/g, '-')}-${size}-${COLOR_CODES[color] || color.slice(0, 3).toUpperCase()}`;
      const qty = 8 + (SIZES.indexOf(size) % 3) + (product.colors.indexOf(color) % 2);

      const row = {
        Handle: product.handle,
        Title: isFirst ? product.title : '',
        'Body (HTML)': isFirst ? bodyHtml : '',
        Vendor: 'Orlaven',
        'Product Category': isFirst
          ? 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets'
          : '',
        Type: isFirst ? product.type : '',
        Tags: isFirst ? tagsStr : '',
        Published: isFirst ? 'TRUE' : '',
        'Option1 Name': 'Size',
        'Option1 Value': size,
        'Option2 Name': 'Color',
        'Option2 Value': color,
        'Option3 Name': '',
        'Option3 Value': '',
        'Variant SKU': sku,
        'Variant Grams': String(product.grams),
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': String(qty),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': product.price.toFixed(2),
        'Variant Compare At Price': product.compareAt ? product.compareAt.toFixed(2) : '',
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Variant Barcode': '',
        'Image Src': isFirst ? unsplash(product.imageIdx) : '',
        'Image Position': isFirst ? '1' : '',
        'Image Alt Text': isFirst
          ? `${product.title} in ${product.colors[0]} - front view`
          : '',
        'Gift Card': 'FALSE',
        'SEO Title': isFirst ? seo.title : '',
        'SEO Description': isFirst ? seo.description : '',
        'Google Shopping / Google Product Category':
          'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
        'Google Shopping / Gender': 'unisex',
        'Google Shopping / Age Group': 'adult',
        'Google Shopping / MPN': sku,
        'Google Shopping / Condition': 'new',
        'Google Shopping / Custom Product': 'TRUE',
        'Variant Image': '',
        'Variant Weight Unit': 'g',
        'Variant Tax Code': '',
        'Cost per item': (product.price * 0.4).toFixed(2),
        Status: 'active',
      };

      rows.push(HEADERS.map((h) => row[h]));
      isFirst = false;
    }
    imageVariantCursor += 1;
  }

  // Additional image rows (images 2..N) - Handle only, everything else blank
  // except Image Src / Position / Alt. We still set Vendor + Published so
  // that the CSV passes a simple "every row has vendor" sanity check.
  for (let i = 2; i <= product.images; i += 1) {
    const imgSrc = unsplash(product.imageIdx + i - 1);
    const altSuffix = i === 2 ? 'side detail' : 'lifestyle';
    const row = {};
    for (const h of HEADERS) row[h] = '';
    row.Handle = product.handle;
    row.Vendor = 'Orlaven';
    row.Published = 'TRUE';
    row['Image Src'] = imgSrc;
    row['Image Position'] = String(i);
    row['Image Alt Text'] = `${product.title} - ${altSuffix}`;
    rows.push(HEADERS.map((h) => row[h]));
  }

  return rows;
}

function main() {
  const lines = [HEADERS.join(',')];
  for (const p of PRODUCTS) {
    for (const cols of emitProduct(p)) {
      lines.push(emitRow(cols));
    }
  }
  fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`wrote ${OUT} (${lines.length} lines incl. header)`);
}

main();
