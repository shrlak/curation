import { useEffect, useRef, useState } from "react";
import { productImageUrl } from "../lib/images.js";
import { blobDataUrl, readProductPhoto } from "../lib/customCollections.js";
import { FallbackIcon } from "./icons.jsx";

/**
 * Image for a personal ("Pharmer's pick") item. Prefers the uploaded photo
 * (IndexedDB), then a metadata image, then microlink, and finally the icon.
 */
export default function CustomImage({ item, tag, children }) {
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState("load"); // load | ok | err
  // stage: uploaded -> direct -> meta -> done
  const stage = useRef("");
  const objectUrl = useRef("");
  const blobRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setStatus("load");
    stage.current = "";
    const cleanupObjectUrl = () => {
      if (objectUrl.current && URL.revokeObjectURL) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    };

    const start = async () => {
      if (item.imageKey) {
        try {
          const blob = await readProductPhoto(item.imageKey);
          if (!alive) return;
          if (blob) {
            blobRef.current = blob;
            stage.current = "uploaded";
            const url = URL.createObjectURL(blob);
            objectUrl.current = url;
            setSrc(url);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      if (item.image) {
        stage.current = "direct";
        setSrc(item.image);
      } else if (item.url) {
        stage.current = "meta";
        setSrc(productImageUrl(item.url));
      } else {
        setStatus("err");
      }
    };
    start();

    return () => {
      alive = false;
      cleanupObjectUrl();
    };
  }, [item.imageKey, item.image, item.url]);

  const onError = async () => {
    if (stage.current === "uploaded") {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = "";
      }
      if (blobRef.current) {
        try {
          const dataUrl = await blobDataUrl(blobRef.current);
          stage.current = "uploaded-data";
          setSrc(dataUrl);
          return;
        } catch {
          /* continue */
        }
      }
    }
    if (stage.current === "direct" || stage.current === "uploaded" || stage.current === "uploaded-data") {
      if (item.url) {
        stage.current = "meta";
        setSrc(productImageUrl(item.url));
        return;
      }
    }
    setStatus("err");
  };

  const uploaded = stage.current === "uploaded" || stage.current === "uploaded-data";

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
