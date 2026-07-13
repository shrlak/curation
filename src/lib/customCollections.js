// Personal "Pharmer's pick" collections — add products from a link or a photo.
// Tabs and products are synced across devices through Firestore; microlink
// metadata extraction and heuristic category inference stay client-side.

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";

const TABS_COLLECTION = "tabs";
const PRODUCTS_COLLECTION = "products";
// Maps the preset category labels shown in the "add a product" dropdown to
// the site's built-in collection routes. Products filed under one of these
// don't get their own custom tab — they're merged directly into that
// built-in collection page instead.
export const BUILTIN_TABS = {
  Necklaces: "necklaces",
  Watches: "watches",
  Lenses: "lenses",
  Scrubs: "scrubs",
};
const BUILTIN_TAB_IDS = new Set(Object.values(BUILTIN_TABS));
const LEGACY_STORAGE_KEY = "curation-for-abigail-custom-collections-v1";
const LEGACY_STORAGE_KEY_V0 = "abigail-orbit-custom-collections-v1";
const LEGACY_IMAGE_DB = "curation-for-abigail-media-v1";
const LEGACY_IMAGE_STORE = "product-images";
const MIGRATION_FLAG = "curation-for-abigail-firestore-migrated-v1";
export const MAX_PHOTO_BYTES = 30 * 1024 * 1024;
// Firestore caps documents at 1 MiB; keep compressed photos well under that
// so the rest of the product fields always fit alongside it.
const MAX_PHOTO_DATA_URL_BYTES = 700_000;

export const uid = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const safeHttps = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

// Resizes/re-encodes a photo in the browser so it can be embedded directly in
// a Firestore document (no separate paid storage bucket needed).
export const compressImageToDataUrl = async (file, maxDimension = 1280) => {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let dataUrl = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    let quality = 0.75;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_PHOTO_DATA_URL_BYTES && quality > 0.35) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length <= MAX_PHOTO_DATA_URL_BYTES) break;
    width = Math.round(width * 0.75);
    height = Math.round(height * 0.75);
  }
  bitmap.close?.();
  return dataUrl;
};

const imageExtension = /\.(?:jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?|svg)$/i;
export const isImageFile = (file) =>
  Boolean(file && (String(file.type || "").startsWith("image/") || imageExtension.test(file.name || "")));

export const formatFileSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const nameFromFile = (name) => {
  let value = String(name || "")
    .replace(/\.[^.]+$/, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value || /^(?:img|dsc|image|photo|screenshot)\s*\d*$/i.test(value)) return "New product photo";
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
};

const categoryRules = [
  ["My Necklaces", /necklace|pendant|목걸이|chain jewelry|egg.?drop/i],
  ["My Watches", /watch|timepiece|시계|chronograph|quartz watch/i],
  ["My Lenses", /camera lens|렌즈|\b\d{1,3}mm\b|e.?mount|dg dn|f\/[0-9.]+/i],
  ["My Scrubs", /scrub|wearfigs|medical uniform|의료복/i],
  ["Sneakers", /sneaker|shoe|trainer|running footwear|운동화|신발/i],
  ["Bags", /handbag|tote|backpack|crossbody|purse|가방/i],
  ["Outerwear", /jacket|coat|parka|blazer|재킷|코트/i],
  ["Beauty", /skincare|serum|cream|cosmetic|makeup|beauty|스킨케어|화장품/i],
  ["Electronics", /camera|headphone|earbud|laptop|tablet|monitor|전자/i],
  ["Home & Living", /furniture|lamp|chair|table|bedding|home decor|가구/i],
  ["Accessories", /jewelry|earring|bracelet|ring|sunglass|accessor|액세서리/i],
];

export const inferCategory = (text, url = "") =>
  categoryRules.find(([, pattern]) => pattern.test(`${text} ${url}`))?.[0] || "New Finds";

const cleanTitle = (title, publisher = "") => {
  let value = String(title || "").replace(/\s+/g, " ").trim();
  if (publisher) {
    value = value.replace(
      new RegExp(`\\s*[|–—-]\\s*${publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"),
      "",
    );
  }
  const parts = value.split(/\s+[|–—]\s+/);
  if (parts[0]?.length > 5) value = parts[0];
  return value.replace(/^(buy|shop)\s+/i, "").trim();
};

const nameFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    let value = decodeURIComponent(segments.pop() || parsed.hostname.replace(/^www\./, ""));
    value = value
      .replace(/\.(html?|php)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\d{7,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return value ? value.replace(/\b\w/g, (char) => char.toUpperCase()) : parsed.hostname.replace(/^www\./, "");
  } catch {
    return "New product";
  }
};

const extractPrice = (data, text) => {
  const direct = [data?.price, data?.sale_price, data?.offer?.price, data?.product?.price].find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  if (direct) {
    const value = typeof direct === "object" ? direct.formatted || direct.display || direct.value || direct.amount : direct;
    if (value !== undefined) return String(value);
  }
  const match =
    String(text || "").match(/(?:US\$|\$|₩|€|£)\s?\d[\d,.]*(?:\.\d{2})?|(?:USD|KRW)\s?\d[\d,.]*/i)?.[0] || "";
  return match.replace(/[.,]$/, "");
};

const flattenSchemas = (value) => {
  const schemas = [];
  const visit = (item) => {
    if (!item) return;
    if (Array.isArray(item)) return item.forEach(visit);
    if (typeof item === "string") {
      try {
        visit(JSON.parse(item));
      } catch {
        /* not json */
      }
      return;
    }
    if (typeof item !== "object") return;
    schemas.push(item);
    visit(item["@graph"]);
  };
  visit(value);
  return schemas;
};

const isProductSchema = (item) => {
  const types = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];
  return types.some((type) => String(type || "").toLowerCase() === "product") || Boolean(item?.offers && item?.name);
};

const firstValue = (value) => (Array.isArray(value) ? value.find(Boolean) : value);

const schemaImage = (product) => {
  const image = firstValue(product?.image);
  return typeof image === "string" ? image : image?.url || image?.contentUrl || "";
};

const formatSchemaPrice = (value, currency = "") => {
  if (value === undefined || value === null || value === "") return "";
  const raw = typeof value === "object" ? value.price ?? value.value ?? value.amount : value;
  const number = Number(String(raw).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number)) return String(raw || "");
  const code = String(currency || "").toUpperCase();
  const symbols = { USD: "$", KRW: "₩", EUR: "€", GBP: "£", JPY: "¥", CAD: "CA$", AUD: "A$" };
  const digits = Number.isInteger(number) ? 0 : 2;
  return `${symbols[code] || `${code}${code ? " " : ""}`}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(number)}`;
};

const schemaPrice = (product) => {
  const offer = firstValue(product?.offers) || {};
  const nested = firstValue(offer?.offers) || {};
  const specification = firstValue(offer?.priceSpecification) || {};
  const value = offer.price ?? offer.lowPrice ?? nested.price ?? specification.price;
  const currency = offer.priceCurrency ?? nested.priceCurrency ?? specification.priceCurrency;
  return formatSchemaPrice(value, currency);
};

const cleanDescription = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const fallbackMetadata = (url) => {
  const name = nameFromUrl(url);
  return {
    name,
    category: inferCategory(name, url),
    price: "",
    note: `${new URL(url).hostname.replace(/^www\./, "")}에서 가져온 제품 링크입니다.`,
    image: "",
    url,
    source: "url",
  };
};

export async function fetchProductMetadata(url, signal) {
  const fallback = fallbackMetadata(url);
  try {
    const schemaSelector = encodeURIComponent('script[type="application/ld+json"]');
    // JSON-LD Product/Offer schemas cover a lot of stores, but plenty of sites
    // only expose price via Open Graph / microdata meta tags — grab those too
    // as a fallback so the price field auto-fills more reliably.
    const priceMetaSelector = encodeURIComponent(
      'meta[property="product:price:amount"],meta[property="og:price:amount"],meta[itemprop="price"]',
    );
    const currencyMetaSelector = encodeURIComponent(
      'meta[property="product:price:currency"],meta[property="og:price:currency"],meta[itemprop="priceCurrency"]',
    );
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}` +
        `&data.schemas.selectorAll=${schemaSelector}&data.schemas.attr=text` +
        `&data.priceMeta.selectorAll=${priceMetaSelector}&data.priceMeta.attr=content` +
        `&data.currencyMeta.selectorAll=${currencyMetaSelector}&data.currencyMeta.attr=content` +
        `&audio=false&video=false&screenshot=false`,
      { signal },
    );
    if (!response.ok) throw new Error(`Metadata ${response.status}`);
    const payload = await response.json();
    const data = payload?.data || {};
    const product = flattenSchemas(data.schemas).find(isProductSchema);
    const brand = typeof product?.brand === "string" ? product.brand : product?.brand?.name || "";
    const title = cleanTitle(product?.name || data.title, data.publisher || brand) || fallback.name;
    const description = cleanDescription(product?.description || data.description);
    const image = schemaImage(product) || data.image?.url || "";
    const metaPrice = formatSchemaPrice(firstValue(data.priceMeta), firstValue(data.currencyMeta));
    const price = schemaPrice(product) || metaPrice || extractPrice(data, `${title} ${description}`);
    return {
      name: title,
      category: inferCategory(`${title} ${description} ${brand} ${data.publisher || ""}`, url),
      price,
      note: description.slice(0, 220) || fallback.note,
      image,
      url,
      source: "metadata",
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return fallback;
  }
}

// Subscribes to the shared `tabs` and `products` collections and calls
// onChange({ collections, builtinItems }):
//   - collections: [{ id, name, items: [...] }] for custom tabs
//   - builtinItems: { necklaces: [...], watches: [...], lenses: [...], scrubs: [...] }
//     for products filed straight into a built-in collection page.
// Returns an unsubscribe function.
export function subscribeCollections(onChange) {
  let tabs = [];
  let products = [];
  let tabsReady = false;
  let productsReady = false;

  const emit = () => {
    if (!tabsReady || !productsReady) return;
    const byTab = new Map(tabs.map((tab) => [tab.id, { ...tab, items: [] }]));
    const builtinItems = Object.fromEntries([...BUILTIN_TAB_IDS].map((id) => [id, []]));
    for (const product of products) {
      if (BUILTIN_TAB_IDS.has(product.tabId)) builtinItems[product.tabId].push(product);
      else byTab.get(product.tabId)?.items.push(product);
    }
    const merged = [...byTab.values()];
    for (const category of merged) category.items.sort((a, b) => b.addedAt - a.addedAt);
    merged.sort((a, b) => a.createdAt - b.createdAt);
    for (const list of Object.values(builtinItems)) list.sort((a, b) => b.addedAt - a.addedAt);
    onChange({ collections: merged, builtinItems });
  };

  const unsubTabs = onSnapshot(collection(db, TABS_COLLECTION), (snap) => {
    tabs = snap.docs.map((d) => ({ id: d.id, name: d.data().name, createdAt: d.data().createdAt?.toMillis?.() || 0 }));
    tabsReady = true;
    emit();
  });
  const unsubProducts = onSnapshot(collection(db, PRODUCTS_COLLECTION), (snap) => {
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    productsReady = true;
    emit();
  });

  return () => {
    unsubTabs();
    unsubProducts();
  };
}

export const addTabDoc = (id, name) =>
  setDoc(doc(db, TABS_COLLECTION, id), { name, createdAt: serverTimestamp() });

export const addProductDoc = (id, data) =>
  setDoc(doc(db, PRODUCTS_COLLECTION, id), { ...data, createdAt: serverTimestamp() });

export const deleteProductDoc = (id) => deleteDoc(doc(db, PRODUCTS_COLLECTION, id));

export const deleteTabDoc = (id) => deleteDoc(doc(db, TABS_COLLECTION, id));

const readLegacyPhoto = (key) =>
  new Promise((resolve) => {
    if (!globalThis.indexedDB) return resolve(null);
    const request = indexedDB.open(LEGACY_IMAGE_DB);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_IMAGE_STORE)) return resolve(null);
      const getRequest = database.transaction(LEGACY_IMAGE_STORE, "readonly").objectStore(LEGACY_IMAGE_STORE).get(key);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => resolve(null);
    };
  });

// One-time upgrade: earlier versions of this app kept tabs/products in this
// browser's localStorage (+ photos in IndexedDB). Now that they're synced
// through Firestore, pull any pre-existing local data in so it isn't
// stranded on whichever device happened to create it.
export async function migrateLocalCollections() {
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY_V0);
    const parsed = raw ? JSON.parse(raw) : [];

    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingTabs = await getDocs(collection(db, TABS_COLLECTION));
      const tabIdByName = new Map(
        existingTabs.docs.map((d) => [String(d.data().name || "").toLowerCase(), d.id]),
      );

      for (const category of parsed) {
        if (!category?.id || !category?.name || !Array.isArray(category.items) || category.items.length === 0) continue;
        const key = category.name.toLowerCase();
        const tabId = tabIdByName.get(key) || category.id;
        if (!tabIdByName.has(key)) {
          await addTabDoc(tabId, category.name);
          tabIdByName.set(key, tabId);
        }
        for (const item of category.items) {
          if (!item?.id || !item?.name) continue;
          let image = item.image || "";
          let imageName = item.imageName || "";
          if (item.imageKey) {
            const blob = await readLegacyPhoto(item.imageKey);
            if (blob) {
              image = await compressImageToDataUrl(blob);
              imageName = imageName || "Uploaded photo";
            }
          }
          await addProductDoc(item.id, {
            tabId,
            name: item.name,
            url: item.url || "",
            price: item.price || "",
            note: item.note || "",
            image,
            imageName,
            addedAt: item.addedAt || Date.now(),
          });
        }
      }
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* leave the migration flag unset so it can be retried next load */
  }
}

const parsePriceNumber = (value) => {
  const match = String(value || "").match(/[\d,.]+/);
  if (!match) return null;
  const number = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
};

// Adapts a raw Firestore product doc filed under a built-in collection
// (see BUILTIN_TABS) into the shape Collection/ProductCard/QuickView expect
// from the site's static catalog data.
export const normalizeCustomProduct = (item, type) => ({
  id: item.id,
  type,
  name: item.name,
  price: parsePriceNumber(item.price),
  priceLabel: item.price || "Research",
  image: item.image || "",
  url: item.url,
  brand: "Your pick",
  note: item.note,
  isCustom: true,
});
