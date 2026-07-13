import { useEffect, useRef, useState } from "react";
import { productImageUrl } from "../lib/images.js";
import { FallbackIcon } from "./icons.jsx";

/**
 * Image for a personal ("Pharmer's pick") item. Prefers the synced photo
 * (embedded in the product record), then a metadata image, then microlink,
 * and finally the icon.
 */
export default function CustomImage({ item, tag, children }) {
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState("load"); // load | ok | err
  // stage: uploaded -> direct -> meta -> done
  const stage = useRef("");

  useEffect(() => {
    setStatus("load");
    if (item.image) {
      stage.current = item.imageName ? "uploaded" : "direct";
      setSrc(item.image);
    } else if (item.url) {
      stage.current = "meta";
      setSrc(productImageUrl(item.url));
    } else {
      setStatus("err");
    }
  }, [item.image, item.imageName, item.url]);

  const onError = () => {
    if ((stage.current === "direct" || stage.current === "uploaded") && item.url) {
      stage.current = "meta";
      setSrc(productImageUrl(item.url));
      return;
    }
    setStatus("err");
  };

  const uploaded = stage.current === "uploaded";

  return (
    <figure className={`media ${status === "ok" ? "has-image" : ""} ${status === "err" ? "err" : ""}`}>
      {tag ? <span className="media-tag">{tag}</span> : null}
      {src && status !== "err" ? (
        <img
          className={`product-img ${status === "ok" ? "loaded" : ""}`}
          src={src}
          alt={item.name}
          loading="lazy"
          decoding="async"
          style={{ objectFit: uploaded ? "cover" : "contain" }}
          onLoad={() => setStatus("ok")}
          onError={onError}
        />
      ) : null}
      <span className="fallback">
        <FallbackIcon type="custom" />
      </span>
      {children}
    </figure>
  );
}
