import { AnimatePresence, motion } from "framer-motion";
import ProductImage from "./ProductImage.jsx";
import { icons } from "./icons.jsx";
import { productMap, variantUrl } from "../data/index.js";

export default function CartDrawer({ open, onClose, favoriteIds, onRemove, colorOf }) {
  const items = favoriteIds.map((id) => productMap.get(id)).filter(Boolean);

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
            aria-label="Cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <h2>Cart</h2>
              <button className="icon-btn" type="button" onClick={onClose} aria-label="Close cart">
                {icons.close}
              </button>
            </div>
            <div className="cart-list">
              {items.length ? (
                items.map((item) => {
                  const color = item.type === "scrub" ? colorOf(item) : "";
                  const url = item.type === "scrub" ? variantUrl(item, color) : item.url;
                  return (
                    <motion.article
                      className="cart-row"
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                    >
                      <ProductImage pageUrl={url} alt={item.name} type={item.type} fit="cover" />
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          {item.brand} · {item.priceLabel}
                          {color ? ` · ${color}` : ""}
                        </p>
                      </div>
                      <button className="cart-remove" type="button" onClick={() => onRemove(item.id)}>
                        Remove
                      </button>
                    </motion.article>
                  );
                })
              ) : (
                <div className="empty">
                  <strong>Your cart is empty.</strong>
                  <br />
                  Use the cart button on any product card.
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
