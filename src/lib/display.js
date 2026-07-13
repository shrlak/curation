// Derives the per-type display fields shown on a product card / quick view.
// Ports the field logic from the original app.js renderer.

export function cardFields(product) {
  if (product.isCustom) {
    return { tag: "Your pick", match: "", matchClass: "", kind: "Personally added", note: product.note };
  }
  const { type } = product;
  const tag =
    type === "watch"
      ? product.similarity || "Watch"
      : type === "lens"
        ? product.focal || "Lens"
        : type === "scrub"
          ? product.category || "FIGS"
          : "Curated pick";

  const match =
    type === "watch"
      ? product.similarity
      : type === "lens"
        ? product.tier?.startsWith("Tier 1")
          ? "Professional"
          : product.tier?.startsWith("Tier 3")
            ? "Budget"
            : "Pro value"
        : type === "scrub"
          ? product.fit
          : "";

  const matchClass = match === "Exact" || match === "Professional" ? "good" : match === "Medium" || match === "Budget" ? "warn" : "";

  const kind =
    type === "watch"
      ? product.segment
      : type === "lens"
        ? `${product.focal} · ${product.aperture}`
        : type === "scrub"
          ? `${product.category} · Women`
          : "Egg-drop necklace";

  const note =
    type === "watch"
      ? `${product.finish || product.notes || ""} · ${product.retailer || ""}`
      : type === "lens"
        ? product.tier
        : type === "scrub"
          ? `${product.best || product.notes || ""} · FIGS`
          : product.note;

  return { tag, match, matchClass, kind, note };
}

const hostnameOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "—";
  }
};

export function quickSpecs(product) {
  if (product.isCustom) {
    return [
      ["Price", product.priceLabel],
      ["Source", hostnameOf(product.url)],
      ["Added by", "You"],
      ["Type", product.type],
    ];
  }
  const { type } = product;
  if (type === "watch")
    return [
      ["Case", product.case],
      ["Strap", product.strap],
      ["Finish", product.finish],
      ["Match", product.similarity],
    ];
  if (type === "lens")
    return [
      ["Focal", product.focal],
      ["Aperture", product.aperture],
      ["Tier", product.tier],
      ["Retailer", product.retailer],
    ];
  if (type === "scrub")
    return [
      ["Category", product.category],
      ["Fit", product.fit],
      ["Fabric", product.fabric],
      ["Retailer", "FIGS"],
    ];
  return [
    ["Price", product.priceLabel],
    ["Retailer", product.retailer],
    ["Style", "Egg-drop"],
    ["Material", "See retailer"],
  ];
}
