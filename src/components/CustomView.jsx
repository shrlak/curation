import { motion } from "framer-motion";
import CustomImage from "./CustomImage.jsx";
import { icons } from "./icons.jsx";
import { normalizeCustomProduct } from "../lib/customCollections.js";

const httpsOnly = (url) => (/^https:\/\//i.test(String(url)) ? url : "#");

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const grid = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

const sourceOf = (item) => {
  if (item.imageName) return "Uploaded photo";
  try {
    return new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    return "Product research";
  }
};

export default function CustomView({ category, onRemove, onAdd, favorites, onToggleFav, onQuick }) {
  return (
    <section className="view collection">
      <div className="container">
        <motion.div
          className="section-head"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="eyebrow">Personal harvest</p>
            <h1>{category.name}</h1>
            <p>직접 추가한 제품을 한곳에서 살펴보고, 각 제품 페이지에서 더 자세한 정보를 확인하세요.</p>
          </div>
          <p className="result-count">
            <b>{category.items.length}</b> products
          </p>
        </motion.div>

        <div className="cc-section-actions">
          <button className="btn primary" type="button" onClick={() => onAdd(category.name)}>
            새로운 pick 추가하기 <span aria-hidden="true">＋</span>
          </button>
          <span>모든 기기에서 자동으로 동기화됨</span>
        </div>

        <motion.ul className="grid" variants={grid} initial="hidden" animate="show">
          {category.items.length ? (
            category.items.map((item) => {
              const isFav = favorites.has(item.id);
              return (
                <motion.li className="card" key={item.id} variants={rise}>
                  <a
                    className="card-link"
                    href={httpsOnly(item.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.name} 자세히 보기`}
                  />
                  <CustomImage item={item} tag={item.imageName ? "Your photo" : "Freshly added"}>
                    <button
                      className="fav"
                      type="button"
                      data-on={isFav}
                      aria-pressed={isFav}
                      aria-label={`${isFav ? "저장 목록에서 제거" : "저장 목록에 추가"} · ${item.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleFav(item.id);
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
                        onQuick(normalizeCustomProduct(item, "custom"));
                      }}
                    >
                      Quick view
                    </button>
                    <button
                      className="card-del"
                      type="button"
                      aria-label={`${item.name} 삭제`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(category.id, item.id);
                      }}
                    >
                      {icons.trash}
                    </button>
                  </CustomImage>
                  <div className="copy">
                    <div className="topline">
                      <div className="badges">
                        <span className="badge accent">{category.name}</span>
                      </div>
                      <span className="price">{item.price || "Research"}</span>
                    </div>
                    <p className="kind">Pharmer's pick</p>
                    <h3>{item.name}</h3>
                    <p className="note">{item.note || "제품 페이지에서 사양, 옵션, 최신 정보를 확인해 보세요."}</p>
                    <span className="card-source">{sourceOf(item)}</span>
                    <span className="card-action">자세히 보기 ↗</span>
                  </div>
                </motion.li>
              );
            })
          ) : (
            <li className="empty">
              <strong>아직 제품이 없어요.</strong>
              <br />첫 제품을 추가하면 이곳에 표시됩니다.
            </li>
          )}
        </motion.ul>
      </div>
    </section>
  );
}
