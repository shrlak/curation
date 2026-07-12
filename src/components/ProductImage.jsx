import { useEffect, useMemo, useState } from "react";
import { productImageUrl, RETRY_LIMIT } from "../lib/images.js";
import { FallbackIcon } from "./icons.jsx";

/**
 * Self-managing product image. Resolves the real product image through
 * microlink, retries a couple of times, then reveals the line-art fallback.
 * Wraps its media container so `has-image` / `err` state stays local.
 */
export default function ProductImage({
  pageUrl,
  imageUrl = "",
  preferRemote = false,
  alt,
  type = "necklace",
  fit = "contain",
  tag,
  className = "media",
  children,
}) {
  const sources = useMemo(() => {
    const available = [];
    if (pageUrl && pageUrl !== "#") available.push("metadata");
    if (imageUrl) available.push("cached");
    if (!preferRemote) available.reverse();
    return available;
  }, [pageUrl, imageUrl, preferRemote]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("load"); // load | ok | err

  useEffect(() => {
    setSourceIndex(0);
    setRetry(0);
    setStatus("load");
  }, [pageUrl, imageUrl, preferRemote]);

  const source = sources[sourceIndex];
  const src = source === "cached" ? imageUrl : source === "metadata" ? productImageUrl(pageUrl, retry) : "";

  const onError = () => {
    if (source === "metadata" && retry < RETRY_LIMIT) {
      setRetry((value) => value + 1);
      return;
    }
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex((value) => value + 1);
      setRetry(0);
      setStatus("load");
      return;
    }
    setStatus("err");
  };

  return (
    <figure className={`${className} ${status === "ok" ? "has-image" : ""} ${status === "err" ? "err" : ""}`}>
      {tag ? <span className="media-tag">{tag}</span> : null}
      {src ? (
        <img
          key={src}
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
