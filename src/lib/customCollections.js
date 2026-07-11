// Personal "Pharmer's pick" collections — add products from a link or a photo.
// Ports the original vanilla logic: IndexedDB photo storage, microlink metadata
// extraction, and heuristic category inference.

export const STORAGE_KEY = "curation-for-abigail-custom-collections-v1";
const LEGACY_STORAGE_KEY = "abigail-orbit-custom-collections-v1";
const IMAGE_DB_NAME = "curation-for-abigail-media-v1";
const IMAGE_STORE = "product-images";
export const MAX_PHOTO_BYTES = 30 * 1024 * 1024;

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

const memoryImages = new Map();
let imageDbPromise;

const openImageDb = () => {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  if (imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE)) request.result.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
  return imageDbPromise;
};

const imageStoreAction = async (mode, action) => {
  const db = await openImageDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, mode);
    const request = action(transaction.objectStore(IMAGE_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storeProductPhoto = async (key, file) => {
  const db = await openImageDb();
  if (!db) {
    memoryImages.set(key, file);
    return;
  }
  await imageStoreAction("readwrite", (store) => store.put(file, key));
};

export const readProductPhoto = async (key) => {
  const db = await openImageDb();
  return db ? imageStoreAction("readonly", (store) => store.get(key)) : memoryImages.get(key) || null;
};

export const deleteProductPhoto = async (key) => {
  if (!key) return;
  const db = await openImageDb();
  if (db) await imageStoreAction("readwrite", (store) => store.delete(key));
  else memoryImages.delete(key);
};

export const blobDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

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
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&data.schemas.selectorAll=${schemaSelector}&data.schemas.attr=text&audio=false&video=false&screenshot=false`,
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
    const price = schemaPrice(product) || extractPrice(data, `${title} ${description}`);
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

export function loadCollections() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((category) => category?.id && category?.name && Array.isArray(category.items))
      : [];
  } catch {
    return [];
  }
}

export const saveCollections = (collections) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    /* ignore */
  }
};
