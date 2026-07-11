import watchesRaw from "./watches.tsv?raw";
import lensesRaw from "./lenses.tsv?raw";
import scrubsRaw from "./scrubs.tsv?raw";
import { necklaces } from "./necklaces.js";

export const fmtPrice = (value) => {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "Live price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

export function parseTsv(text) {
  const rows = text.trim().split(/\r?\n/).map((row) => row.split("\t"));
  const headers = rows.shift();
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

const hostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function normalize(rows, type) {
  return rows.map((row, index) => {
    const price = row.price === "" ? null : Number(row.price);
    const item = {
      ...row,
      id: `${type}-${index + 1}`,
      type,
      price,
      priceLabel: fmtPrice(price),
    };
    if (type === "lens") item.retailer = hostname(row.url);
    return item;
  });
}

export const watches = normalize(parseTsv(watchesRaw), "watch");
export const lenses = normalize(parseTsv(lensesRaw), "lens");
export const scrubs = normalize(parseTsv(scrubsRaw), "scrub");
export { necklaces };

// Fast lookup for quick view / cart hydration.
export const productMap = new Map();
[...necklaces, ...watches, ...lenses, ...scrubs].forEach((item) => productMap.set(item.id, item));

export const collections = {
  necklaces: { key: "necklaces", type: "necklace", items: necklaces },
  watches: { key: "watches", type: "watch", items: watches },
  lenses: { key: "lenses", type: "lens", items: lenses },
  scrubs: { key: "scrubs", type: "scrub", items: scrubs },
};

export const totalCount = necklaces.length + watches.length + lenses.length + scrubs.length;

// Color variants (scrubs) --------------------------------------------------
export const COLOR_HEX = {
  Black: "#1d1d1f",
  Navy: "#17213d",
  "Ceil Blue": "#79a8cf",
  "Royal Blue": "#2452a4",
  Burgundy: "#742a3a",
  Moss: "#596955",
  "Caribbean Blue": "#217f8d",
  Charcoal: "#4d5055",
  Celery: "#b7c878",
  "Deep Purple": "#4d2d68",
  "Light Deep Purple": "#8b79aa",
  White: "#f6f5f1",
  "Optic White": "#ffffff",
};

export const colorsFor = (product) =>
  String(product?.colors || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 10);

export function variantUrl(product, color, secondary = false) {
  const base = secondary && product.secondary_url ? product.secondary_url : product.url;
  try {
    const url = new URL(base, location.href);
    if (color) url.searchParams.set("color", color);
    return url.toString();
  } catch {
    return base || "#";
  }
}
