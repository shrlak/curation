import { AnimatePresence, motion } from "framer-motion";
import ProductImage from "./ProductImage.jsx";
import ColorSwatches from "./ColorSwatches.jsx";
import { icons } from "./icons.jsx";
import { quickSpecs } from "../lib/display.js";
import { colorsFor, variantUrl } from "../data/index.js";

const httpsOnly = (url) => (/^https:\/\//i.test(String(url)) ? url : "#");

export default function QuickView({ product, onClose, colorOf, setColor }) {
  const isScrub = product?.type === "scrub";
  const color = product && isScrub ? colorOf(product) : "";
  const hasColors = isScrub && colorsFor(product).length > 1;
  const url = product ? (isScrub ? variantUrl(product, color) : product.url) : "#";
  const typeLine = product
    ? product.isCustom
      ? "Your pick · Personally added"
      : isScrub
        ? `FIGS · ${product.category || "Scrubs"} · ${color}`
        : `${product.brand} · ${product.type}`
    : "";

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="icon-btn modal-close" type="button" onClick={onClose} aria-label="Close quick view">
              {icons.close}
            </button>
            <div className="quick-layout">
              <ProductImage
                className="quick-media"
                pageUrl={url}
                imageUrl={product.image}
                preferRemote={isScrub}
                alt={product.name}
                type={product.type}
                fit="contain"
              />
              <div className="quick-info">
                <p className="eyebrow">{typeLine}</p>
                <h2>{product.name}</h2>
                <p>{product.notes || product.note || product.best || "Open the product page for current details."}</p>
                <div className="specs">
                  {quickSpecs(product).map(([label, value]) => (
                    <div className="spec" key={label}>
                      <small>{label}</small>
                      <b>{value || "—"}</b>
                    </div>
                  ))}
                </div>
                {hasColors && (
                  <div className="color-row" style={{ marginBottom: 22 }}>
                    <div className="color-copy">
                      <span>Color</span>
                      <strong>{color}</strong>
                    </div>
                    <ColorSwatches product={product} selected={color} onSelect={(c) => setColor(product, c)} />
                  </div>
                )}
                <a className="btn primary" href={httpsOnly(url)} target="_blank" rel="noopener noreferrer">
                  View product <span className="arrow">↗</span>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
