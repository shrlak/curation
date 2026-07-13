import { motion } from "framer-motion";
import ProductImage from "./ProductImage.jsx";
import ColorSwatches from "./ColorSwatches.jsx";
import { icons } from "./icons.jsx";
import { cardFields } from "../lib/display.js";
import { variantUrl, colorsFor } from "../data/index.js";

const httpsOnly = (url) => (/^https:\/\//i.test(String(url)) ? url : "#");

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function ProductCard({ product, isFav, onToggleFav, onQuick, color, onColor, onDelete }) {
  const { tag, match, matchClass, kind, note } = cardFields(product);
  const isScrub = product.type === "scrub";
  const hasColors = isScrub && colorsFor(product).length > 1;
  const url = isScrub ? variantUrl(product, color) : product.url;
  const href = httpsOnly(url);
  const mediaTag = hasColors ? color : tag;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--cx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--cy", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.li className="card" variants={rise} onPointerMove={onMove}>
      <a className="card-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${product.name} product page`} />
      <ProductImage
        pageUrl={url}
        imageUrl={product.image}
        preferRemote={isScrub}
        alt={product.name}
        type={product.type}
        tag={mediaTag}
      >
        <button
          className="fav"
          type="button"
          data-on={isFav}
          aria-pressed={isFav}
          aria-label={`${isFav ? "Remove" : "Add"} ${product.name} ${isFav ? "from" : "to"} saved list`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFav(product.id);
          }}
        >
          {isFav ? icons.heartFilled : icons.heart}
        </button>
        <button
          className="quick btn"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuick(product);
          }}
        >
          Quick view
        </button>
        {product.isCustom && (
          <button
            className="card-del"
            type="button"
            aria-label={`${product.name} 삭제`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(product.id);
            }}
          >
            {icons.trash}
          </button>
        )}
      </ProductImage>

      <div className="copy">
        <div className="topline">
          <div className="badges">
            <span className="badge accent">{product.brand}</span>
            {match ? <span className={`badge ${matchClass}`}>{match}</span> : null}
          </div>
          <span className="price">{product.priceLabel}</span>
        </div>
        <p className="kind">{kind || "Curated product"}</p>
        <h3>{product.name}</h3>
        <p className="note">{note || "Open the product page for current details."}</p>

        {hasColors && (
          <div className="color-row">
            <div className="color-copy">
              <span>Color</span>
              <strong>{color}</strong>
            </div>
            <ColorSwatches product={product} selected={color} onSelect={(c) => onColor(product, c)} compact />
          </div>
        )}

        <span className="card-action">View product ↗</span>
      </div>
    </motion.li>
  );
}
