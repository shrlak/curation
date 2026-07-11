// Product images are resolved through microlink's og:image extractor. We only
// ever show the real product image (never a page screenshot); on failure we
// retry a couple of times and then fall back to the line-art icon.
export const RETRY_LIMIT = 2;

export function productImageUrl(pageUrl, retry = 0) {
  const params = new URLSearchParams({ url: pageUrl, embed: "image.url" });
  if (retry > 0) params.set("force", "true");
  if (retry > 1) params.set("_retry", String(Date.now()));
  return `https://api.microlink.io/?${params.toString()}`;
}

export const safeHttps = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};
