import { useEffect, useState } from "react";
import { productImageUrl, RETRY_LIMIT } from "../lib/images.js";
import { FallbackIcon } from "./icons.jsx";

/**
 * Self-managing product image. Resolves the real product image through
 * microlink, retries a couple of times, then reveals the line-art fallback.
 * Wraps its media container so `has-image` / `err` state stays local.
 */
export default function ProductImage({
  pageUrl,
  alt,
  type = "necklace",
  fit = "contain",
  tag,
  className = "media",
  children,
}) {
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("load"); // load | ok | err

  useEffect(() => {
    setRetry(0);
    setStatus("load");
  }, [pageUrl]);

  const usable = pageUrl && pageUrl !== "#";
  const src = usable ? productImageUrl(pageUrl, retry) : "";

  const onError = () => {
    if (retry < RETRY_LIMIT) setRetry((r) => r + 1);
    else setStatus("err");
  };

  return (
    <figure className={`${className} ${status === "ok" ? "has-image" : ""} ${status === "err" ? "err" : ""}`}>
      {tag ? <span className="media-tag">{tag}</span> : null}
      {usable ? (
        <img
          className={`product-img ${status === "ok" ? "loaded" : ""}`}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{ objectFit: fit }}
          onLoad={() => setStatus("ok")}
          onError={onError}
        />
      ) : null}
      <span className="fallback">
        <FallbackIcon type={type} />
      </span>
      {children}
    </figure>
  );
}
