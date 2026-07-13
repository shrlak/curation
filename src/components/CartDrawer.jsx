import { AnimatePresence, motion } from "framer-motion";
import ProductImage from "./ProductImage.jsx";
import { icons } from "./icons.jsx";
import { productMap, variantUrl } from "../data/index.js";

const httpsOnly = (url) => (/^https:\/\//i.test(String(url)) ? url : "#");

export default function CartDrawer({ open, onClose, favoriteIds, onRemove, colorOf, customProductMap }) {
  const items = favoriteIds.map((id) => productMap.get(id) || customProductMap?.get(id)).filter(Boolean);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.aside
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Saved list"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <h2>Saved</h2>
              <button className="icon-btn" type="button" onClick={onClose} aria-label="Close saved list">
                {icons.close}
              </button>
            </div>
            <ul className="cart-list">
              {items.length ? (
                items.map((item) => {
                  const color = item.type === "scrub" ? colorOf(item) : "";
                  const url = item.type === "scrub" ? variantUrl(item, color) : item.url;
                  const href = httpsOnly(url);
                  return (
                    <motion.li
                      className="cart-row"
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                    >
                      <ProductImage
                        pageUrl={url}
                        imageUrl={item.image}
                        preferRemote={item.type === "scrub"}
                        alt={item.name}
                        type={item.type}
                        fit="cover"
                      />
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          {item.brand} · {item.priceLabel}
                          {color ? ` · ${color}` : ""}
                        </p>
                      </div>
                      <div className="cart-row-actions">
                        <a
                          className="cart-buy"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Go to ${item.name} product page`}
                        >
                          {icons.cart}
                        </a>
                        <button
                          className="cart-remove"
                          type="button"
                          onClick={() => onRemove(item.id)}
                          aria-label={`Remove ${item.name} from saved list`}
                        >
                          Remove
                        </button>
                      </div>
                    </motion.li>
                  );
                })
              ) : (
                <li className="empty">
                  <strong>Your saved list is empty.</strong>
                  <br />
                  Tap the heart on any product card to save it here.
                </li>
              )}
            </ul>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
