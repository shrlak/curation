(() => {
  const COLORS = [
    { name: "Black", hex: "#1d1d1f" },
    { name: "Navy", hex: "#17213d" },
    { name: "Ceil Blue", hex: "#73a7d3" },
    { name: "Moss", hex: "#4c5b4d" },
    { name: "Burgundy", hex: "#742a35" }
  ];
  const PRODUCT_NAME = "THE SET — Catarina + Isabel Wide-Leg";
  const PANTS_URL = "https://www.wearfigs.com/products/womens-isabel-scrub-pants";
  const TOP_URL = "https://www.wearfigs.com/search?q=Catarina%20One-Pocket%20Scrub%20Top";
  let currentColor = localStorage.getItem("abigail-the-set-color") || "Black";
  let gridObserver = null;

  const variantUrl = (base, color) => {
    const url = new URL(base);
    url.searchParams.set("color", color);
    return url.toString();
  };
  const imageUrl = color => `https://api.microlink.io/?url=${encodeURIComponent(variantUrl(PANTS_URL, color))}&embed=image.url`;
  const screenshotUrl = color => `https://api.microlink.io/?url=${encodeURIComponent(variantUrl(PANTS_URL, color))}&screenshot=true&meta=false&embed=screenshot.url`;
  const previewUrl = color => `https://image.thum.io/get/width/1000/crop/1100/noanimate/${variantUrl(PANTS_URL, color)}`;
  const swatches = (attribute, selected) => COLORS.map(color => `<button class="swatch${attribute === "data-set-color" ? " swatch-large" : ""}" type="button" style="--swatch:${color.hex}" ${attribute}="${color.name}" aria-label="${color.name}" aria-pressed="${color.name === selected}"></button>`).join("");

  function loadVariantImage(image, color) {
    if (!image) return;
    image.classList.remove("loaded", "screenshot");
    image.closest(".media")?.classList.remove("has-image", "error");
    image.alt = `${PRODUCT_NAME} in ${color}`;
    image.dataset.variantFallback = "";
    image.onload = () => {
      image.classList.add("loaded");
      image.closest(".media")?.classList.add("has-image");
    };
    image.onerror = () => {
      if (!image.dataset.variantFallback) {
        image.dataset.variantFallback = "screenshot";
        image.classList.add("screenshot");
        image.src = screenshotUrl(color);
      } else if (image.dataset.variantFallback === "screenshot") {
        image.dataset.variantFallback = "preview";
        image.src = previewUrl(color);
      } else {
        image.closest(".media")?.classList.add("error");
      }
    };
    image.src = imageUrl(color);
  }

  function renderFeature() {
    const feature = document.querySelector("#set-feature");
    if (!feature) return;
    const image = feature.querySelector("#set-image");
    const pantsLink = feature.querySelector("#set-pants-link");
    const topLink = feature.querySelector("#set-top-link");
    const label = feature.querySelector("#set-color-name");
    const swatchWrap = feature.querySelector("#set-swatches");
    if (label) label.textContent = currentColor;
    if (pantsLink) pantsLink.href = variantUrl(PANTS_URL, currentColor);
    if (topLink) topLink.href = variantUrl(TOP_URL, currentColor);
    if (swatchWrap) {
      swatchWrap.innerHTML = swatches("data-set-color", currentColor);
      swatchWrap.querySelectorAll("[data-set-color]").forEach(button => button.addEventListener("click", () => selectColor(button.dataset.setColor)));
    }
    loadVariantImage(image, currentColor);
  }

  function findSetCard() {
    return [...document.querySelectorAll("#scrub-grid .card")].find(card => card.querySelector("h3")?.textContent.trim() === PRODUCT_NAME);
  }

  function renderCardControls() {
    const card = findSetCard();
    if (!card) return false;
    const copy = card.querySelector(".copy");
    let row = card.querySelector(".color-row");
    if (!row && copy) {
      row = document.createElement("div");
      row.className = "color-row";
      const action = copy.querySelector(".card-action");
      action ? copy.insertBefore(row, action) : copy.appendChild(row);
    }
    if (row) {
      row.innerHTML = `<div class="color-copy"><span>Color</span><strong>${currentColor}</strong></div><div class="swatches" role="group" aria-label="Choose THE SET color">${swatches("data-card-color", currentColor)}</div>`;
      row.querySelectorAll("[data-card-color]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        selectColor(button.dataset.cardColor);
      }));
    }
    const link = variantUrl(PANTS_URL, currentColor);
    card.querySelectorAll(".card-link, h3 a, .card-action").forEach(element => {
      if (element.tagName === "A") element.href = link;
    });
    const tag = card.querySelector(".media-tag");
    if (tag) tag.textContent = currentColor;
    loadVariantImage(card.querySelector(".product-img"), currentColor);
    return true;
  }

  function updateQuickView() {
    const dialog = document.querySelector("#quick-dialog");
    if (!dialog?.open || document.querySelector("#quick-name")?.textContent.trim() !== PRODUCT_NAME) return;
    const type = document.querySelector("#quick-type");
    const link = document.querySelector("#quick-link");
    const image = document.querySelector("#quick-image");
    if (type) type.textContent = `FIGS · scrub · ${currentColor}`;
    if (link) link.href = variantUrl(PANTS_URL, currentColor);
    loadVariantImage(image, currentColor);
    let controls = document.querySelector("#quick-color-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.id = "quick-color-controls";
      controls.className = "quick-colors";
      document.querySelector("#quick-specs")?.after(controls);
    }
    controls.innerHTML = `<div class="color-row"><div class="color-copy"><span>Color</span><strong>${currentColor}</strong></div><div class="swatches" role="group" aria-label="Choose THE SET color">${swatches("data-quick-color", currentColor)}</div></div>`;
    controls.querySelectorAll("[data-quick-color]").forEach(button => button.addEventListener("click", () => selectColor(button.dataset.quickColor)));
  }

  function selectColor(color) {
    if (!COLORS.some(option => option.name === color)) return;
    currentColor = color;
    localStorage.setItem("abigail-the-set-color", color);
    renderFeature();
    renderCardControls();
    updateQuickView();
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = `${color} preview selected.`;
      toast.classList.add("show");
      clearTimeout(selectColor.timer);
      selectColor.timer = setTimeout(() => toast.classList.remove("show"), 1800);
    }
  }

  function watchForCard() {
    const grid = document.querySelector("#scrub-grid");
    if (!grid) return;
    renderCardControls();
    if (gridObserver) return;
    gridObserver = new MutationObserver(() => renderCardControls());
    gridObserver.observe(grid, { childList: true });
  }

  document.addEventListener("click", event => {
    const quick = event.target.closest("[data-quick]");
    const card = quick?.closest(".card");
    if (card?.querySelector("h3")?.textContent.trim() === PRODUCT_NAME) setTimeout(updateQuickView, 80);
  }, true);

  function init() {
    renderFeature();
    watchForCard();
    const partialObserver = new MutationObserver(() => {
      if (document.querySelector("#set-feature")) renderFeature();
      if (document.querySelector("#scrub-grid")) watchForCard();
    });
    partialObserver.observe(document.querySelector("#main"), { childList: true });
    setTimeout(() => partialObserver.disconnect(), 8000);
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
