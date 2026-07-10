(() => {
  const COLOR_HEX = {
    "Black": "#1d1d1f",
    "Navy": "#17213d",
    "Ceil Blue": "#79a8cf",
    "Royal Blue": "#2452a4",
    "Burgundy": "#742a3a",
    "Moss": "#596955",
    "Caribbean Blue": "#217f8d",
    "Charcoal": "#4d5055",
    "Celery": "#b7c878",
    "Deep Purple": "#4d2d68",
    "Light Deep Purple": "#8b79aa",
    "White": "#f6f5f1",
    "Optic White": "#ffffff"
  };

  const STORAGE_KEY = "abigail-product-colors-v2";
  const selectedColors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const productsByName = new Map();
  const productsBySlug = new Map();
  let currentQuickProduct = null;
  let domObserver = null;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const parseTsv = text => {
    const rows = text.trim().split(/\r?\n/).map(row => row.split("\t"));
    const headers = rows.shift();
    return rows.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  };

  const colorsFor = product => String(product.colors || "").split("|").map(value => value.trim()).filter(Boolean).slice(0, 10);
  const productKey = product => product.slug || product.name;
  const selectedFor = product => {
    const choices = colorsFor(product);
    const saved = selectedColors[productKey(product)];
    return choices.includes(saved) ? saved : choices[0] || "Black";
  };

  function saveColor(product, color) {
    selectedColors[productKey(product)] = color;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedColors));
  }

  function variantUrl(product, color, secondary = false) {
    const base = secondary && product.secondary_url ? product.secondary_url : product.url;
    try {
      const url = new URL(base, location.href);
      url.searchParams.set("color", color);
      return url.toString();
    } catch {
      return base || "#";
    }
  }

  const metaImageUrl = url => `https://api.microlink.io/?url=${encodeURIComponent(url)}&embed=image.url`;
  const screenshotUrl = url => `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
  const previewUrl = url => `https://image.thum.io/get/width/1000/crop/1100/noanimate/${url}`;

  function setImageWithFallback(image, pageUrl, alt, media = image?.closest(".media")) {
    if (!image || !pageUrl) return;
    image.removeAttribute("onload");
    image.removeAttribute("onerror");
    image.classList.remove("loaded", "screenshot");
    media?.classList.remove("has-image", "error");
    image.alt = alt || "Product image";
    image.dataset.variantStage = "meta";

    image.onload = () => {
      image.classList.add("loaded");
      media?.classList.add("has-image");
      media?.classList.remove("error");
    };

    image.onerror = () => {
      if (image.dataset.variantStage === "meta") {
        image.dataset.variantStage = "screenshot";
        image.classList.add("screenshot");
        image.src = screenshotUrl(pageUrl);
        return;
      }
      if (image.dataset.variantStage === "screenshot") {
        image.dataset.variantStage = "preview";
        image.src = previewUrl(pageUrl);
        return;
      }
      media?.classList.add("error");
    };

    image.src = metaImageUrl(pageUrl);
  }

  function swatchMarkup(product, selected, attribute) {
    return colorsFor(product).map(color => {
      const hex = COLOR_HEX[color] || "#b7b7bc";
      return `<button class="swatch" type="button" style="--swatch:${hex}" ${attribute}="${escapeHtml(productKey(product))}" data-color="${escapeHtml(color)}" aria-label="${escapeHtml(color)}" title="${escapeHtml(color)}" aria-pressed="${color === selected}"></button>`;
    }).join("");
  }

  function findCard(product) {
    return [...document.querySelectorAll("#scrub-grid .card")].find(card => card.querySelector("h3")?.textContent.trim() === product.name);
  }

  function updateCard(product) {
    const card = findCard(product);
    if (!card) return false;
    const color = selectedFor(product);
    const pageUrl = variantUrl(product, color);
    const copy = card.querySelector(".copy");
    let row = card.querySelector(".product-color-row");

    card.classList.add("has-color-options");

    if (!row && copy && colorsFor(product).length > 1) {
      row = document.createElement("div");
      row.className = "color-row product-color-row";
      const action = copy.querySelector(".card-action");
      action ? copy.insertBefore(row, action) : copy.appendChild(row);
    }

    if (row) {
      row.innerHTML = `<div class="color-copy"><span>Color</span><strong>${escapeHtml(color)}</strong></div><div class="swatches compact" role="group" aria-label="Choose ${escapeHtml(product.name)} color">${swatchMarkup(product, color, "data-product-color")}</div>`;
      row.querySelectorAll("[data-product-color]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        selectColor(product, button.dataset.color);
      }));
    }

    card.querySelectorAll(".card-link, h3 a, .card-action").forEach(element => {
      if (element.tagName === "A") element.href = pageUrl;
    });
    const tag = card.querySelector(".media-tag");
    if (tag) tag.textContent = color;
    setImageWithFallback(card.querySelector(".product-img"), pageUrl, `${product.name} in ${color}`);
    return true;
  }

  function updateFeature() {
    const product = productsBySlug.get("the-set-wide-leg");
    const feature = document.querySelector("#set-feature");
    if (!product || !feature) return;
    const color = selectedFor(product);
    const pantsUrl = variantUrl(product, color);
    const topUrl = variantUrl(product, color, true);
    const label = feature.querySelector("#set-color-name");
    const swatches = feature.querySelector("#set-swatches");
    const pantsLink = feature.querySelector("#set-pants-link");
    const topLink = feature.querySelector("#set-top-link");
    if (label) label.textContent = color;
    if (pantsLink) pantsLink.href = pantsUrl;
    if (topLink) topLink.href = topUrl;
    if (swatches) {
      swatches.innerHTML = swatchMarkup(product, color, "data-feature-color");
      swatches.querySelectorAll("[data-feature-color]").forEach(button => button.addEventListener("click", () => selectColor(product, button.dataset.color)));
    }
    setImageWithFallback(feature.querySelector("#set-image"), pantsUrl, `${product.name} in ${color}`, feature.querySelector(".set-media"));
  }

  function updateQuickView(product = currentQuickProduct) {
    const dialog = document.querySelector("#quick-dialog");
    if (!product || !dialog?.open || document.querySelector("#quick-name")?.textContent.trim() !== product.name) return;
    currentQuickProduct = product;
    const color = selectedFor(product);
    const pageUrl = variantUrl(product, color);
    const type = document.querySelector("#quick-type");
    const link = document.querySelector("#quick-link");
    if (type) type.textContent = `FIGS · ${product.category || "Scrubs"} · ${color}`;
    if (link) link.href = pageUrl;
    setImageWithFallback(document.querySelector("#quick-image"), pageUrl, `${product.name} in ${color}`, document.querySelector(".quick-media"));

    let controls = document.querySelector("#quick-color-controls");
    if (colorsFor(product).length <= 1) {
      controls?.remove();
      return;
    }
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "quick-color-controls";
      controls.className = "quick-colors";
      document.querySelector("#quick-specs")?.after(controls);
    }
    controls.innerHTML = `<div class="color-row"><div class="color-copy"><span>Color</span><strong>${escapeHtml(color)}</strong></div><div class="swatches" role="group" aria-label="Choose ${escapeHtml(product.name)} color">${swatchMarkup(product, color, "data-quick-color")}</div></div>`;
    controls.querySelectorAll("[data-quick-color]").forEach(button => button.addEventListener("click", () => selectColor(product, button.dataset.color)));
  }

  function updateFavorites() {
    document.querySelectorAll("#favorite-list .fav-row").forEach(row => {
      const name = row.querySelector("h3")?.textContent.trim();
      const product = productsByName.get(name);
      if (!product) return;
      const color = selectedFor(product);
      const image = row.querySelector("img");
      const pageUrl = variantUrl(product, color);
      setImageWithFallback(image, pageUrl, `${product.name} in ${color}`, row);
      let label = row.querySelector(".favorite-color");
      if (!label) {
        label = document.createElement("small");
        label.className = "favorite-color";
        row.querySelector("div")?.appendChild(label);
      }
      if (label) label.textContent = `Color: ${color}`;
    });
  }

  function selectColor(product, color) {
    if (!colorsFor(product).includes(color)) return;
    saveColor(product, color);
    updateCard(product);
    if (product.slug === "the-set-wide-leg") updateFeature();
    updateQuickView(product);
    updateFavorites();
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = `${product.name}: ${color} selected.`;
      toast.classList.add("show");
      clearTimeout(selectColor.timer);
      selectColor.timer = setTimeout(() => toast.classList.remove("show"), 1800);
    }
  }

  function enhanceScrubCards() {
    productsByName.forEach(product => updateCard(product));
  }

  function repairOtherProductImages() {
    document.querySelectorAll(".card").forEach(card => {
      const name = card.querySelector("h3")?.textContent.trim();
      if (productsByName.has(name)) return;
      const image = card.querySelector(".product-img");
      const link = card.querySelector(".card-link")?.href;
      if (!image || !link || image.classList.contains("loaded") || image.dataset.repairStarted) return;
      image.dataset.repairStarted = "1";
      setTimeout(() => {
        if (!image.classList.contains("loaded")) setImageWithFallback(image, link, name || "Product image");
      }, 4200);
    });
  }

  function bindQuickViewListener() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-quick]");
      if (!button) return;
      const name = button.closest(".card")?.querySelector("h3")?.textContent.trim();
      const product = productsByName.get(name);
      if (!product) {
        currentQuickProduct = null;
        document.querySelector("#quick-color-controls")?.remove();
        return;
      }
      currentQuickProduct = product;
      setTimeout(() => updateQuickView(product), 80);
    }, true);
  }

  function observeDom() {
    if (domObserver) return;
    let queued = false;
    domObserver = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        enhanceScrubCards();
        updateFeature();
        updateFavorites();
        repairOtherProductImages();
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    try {
      const response = await fetch("scrubs.tsv", { cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to load scrubs.tsv (${response.status})`);
      const products = parseTsv(await response.text());
      products.forEach(product => {
        productsByName.set(product.name, product);
        productsBySlug.set(product.slug || product.name, product);
      });
      bindQuickViewListener();
      observeDom();
      enhanceScrubCards();
      updateFeature();
      repairOtherProductImages();
      setTimeout(() => {
        enhanceScrubCards();
        repairOtherProductImages();
      }, 1800);
    } catch (error) {
      console.error("Unable to initialize product color variants", error);
    }
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();