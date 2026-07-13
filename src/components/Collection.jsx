import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Toolbar from "./Toolbar.jsx";
import ProductCard from "./ProductCard.jsx";
import SetFeature from "./SetFeature.jsx";
import { collections } from "../data/index.js";
import { normalizeCustomProduct } from "../lib/customCollections.js";

const META = {
  necklaces: {
    eyebrow: "Necklace collection",
    title: ["에그 드롭,", "다섯 가지 선택."],
    desc: "동일한 실루엣을 가격과 판매처 기준으로 빠르게 비교할 수 있습니다.",
  },
  watches: {
    eyebrow: "Watch collection",
    title: ["Coach Sammy의", "감각을 기준으로."],
    desc: "정확한 모델부터 비슷한 타원형 주얼리 워치까지 검색하고 정렬하세요.",
    dim: "segment",
    placeholder: "Brand, model, retailer…",
    filterLabel: "All categories",
    sortOptions: [
      ["recommended", "Recommended"],
      ["price-asc", "Price: low to high"],
      ["price-desc", "Price: high to low"],
      ["name", "Name"],
    ],
  },
  lenses: {
    eyebrow: "Lens collection",
    title: ["Sony E-mount,", "목적에 맞는 한 개."],
    desc: "초점거리, 조리개, 가격대에 따라 프라임과 줌 렌즈를 비교하세요.",
    dim: "tier",
    placeholder: "Brand, focal length, aperture…",
    filterLabel: "All tiers",
    sortOptions: [
      ["recommended", "Recommended"],
      ["price-asc", "Price: low to high"],
      ["price-desc", "Price: high to low"],
      ["name", "Name"],
    ],
  },
  scrubs: {
    eyebrow: "Women's FIGS collection",
    title: ["근무를 위한 기능,", "일상을 위한 실루엣."],
    desc: "재킷, 언더스크럽, 스크럽 상의와 하의를 카테고리별로 살펴보세요. 가격과 재고는 FIGS에서 실시간 확인합니다.",
    dim: "category",
    placeholder: "Set, jacket, underscrub, top, pants…",
    filterLabel: "All categories",
    sortOptions: [
      ["recommended", "Recommended"],
      ["name", "Name"],
      ["category", "Category"],
    ],
  },
};

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export default function Collection({ collectionKey, favorites, onToggleFav, onQuick, colorOf, setColor, customItems = [] }) {
  const config = collections[collectionKey];
  const meta = META[collectionKey];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("recommended");

  const allItems = useMemo(
    () => [...customItems.map((item) => normalizeCustomProduct(item, config.type)), ...config.items],
    [config.items, config.type, customItems],
  );

  const filterOptions = useMemo(() => {
    if (!meta.dim) return [];
    return [...new Set(allItems.map((item) => item[meta.dim]).filter(Boolean))].sort();
  }, [allItems, meta.dim]);

  const visible = useMemo(() => {
    let list = [...allItems];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((item) => Object.values(item).join(" ").toLowerCase().includes(q));
    if (filter && meta.dim) list = list.filter((item) => item[meta.dim] === filter);
    if (sort === "price-asc") list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "price-desc") list.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "category") list.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    return list;
  }, [allItems, query, filter, sort, meta.dim]);

  const setProduct = collectionKey === "scrubs" ? config.items.find((item) => item.slug === "the-set-wide-leg") : null;
  const hasToolbar = Boolean(meta.dim);

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
            <p className="eyebrow">{meta.eyebrow}</p>
            <h1>
              {meta.title[0]}
              <br />
              {meta.title[1]}
            </h1>
            <p>{meta.desc}</p>
          </div>
          <p className="result-count">
            <b>{visible.length}</b> products
          </p>
        </motion.div>

        {setProduct && (
          <SetFeature product={setProduct} color={colorOf(setProduct)} onColor={setColor} />
        )}

        {hasToolbar && (
          <Toolbar
            query={query}
            onQuery={setQuery}
            placeholder={meta.placeholder}
            filter={filter}
            onFilter={setFilter}
            filterLabel={meta.filterLabel}
            filterOptions={filterOptions}
            sort={sort}
            onSort={setSort}
            sortOptions={meta.sortOptions}
            onClear={() => {
              setQuery("");
              setFilter("");
              setSort("recommended");
            }}
          />
        )}

        <motion.ul className="grid" variants={grid} initial="hidden" animate="show" key={`${filter}-${sort}-${query}`}>
          {visible.length ? (
            visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFav={favorites.has(product.id)}
                onToggleFav={onToggleFav}
                onQuick={onQuick}
                color={colorOf(product)}
                onColor={setColor}
              />
            ))
          ) : (
            <li className="empty">
              <strong>No matching products.</strong>
              <br />
              Try a different search or filter.
            </li>
          )}
        </motion.ul>
      </div>
    </section>
  );
}
