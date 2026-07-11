import { motion } from "framer-motion";
import { icons, FallbackIcon } from "./icons.jsx";
import AnimatedNumber from "./AnimatedNumber.jsx";
import { collections, totalCount } from "../data/index.js";

const headline = ["Abigail을 위해", "고른 제품들."];

const CATS = [
  { route: "necklaces", type: "necklace", label: "Necklaces", tag: "Egg-drop silhouettes", copy: "누아즈 · 로렌하이 셀렉션" },
  { route: "watches", type: "watch", label: "Watches", tag: "Coach Sammy inspired", copy: "타원형 주얼리 워치" },
  { route: "lenses", type: "lens", label: "Lenses", tag: "Sony E-mount", copy: "프라임 · 줌 렌즈 비교" },
  { route: "scrubs", type: "scrub", label: "Scrubs", tag: "FIGS women's edit", copy: "근무를 위한 실루엣" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const Chip = ({ cls, type, label, sub }) => (
  <motion.span
    className={`chip ${cls}`}
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    {icons[type]}
    <span>
      <b>{label}</b>
      <small>{sub}</small>
    </span>
  </motion.span>
);

export default function Home({ go, onOpenAdd }) {
  const scrollToCollections = () => document.getElementById("home-collections")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="view">
      <div className="container">
        <div className="hero">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.p className="eyebrow" variants={rise}>
              Abigail's curated index
            </motion.p>
            <h1>
              {headline.map((line, i) => (
                <span className="line" key={line}>
                  <motion.span style={{ display: "block" }} variants={rise} className={i === 1 ? "grad-text" : ""}>
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p className="hero-lede kw" variants={rise}>
              약학도의 꼼꼼한 시선으로 고르고, 파머스 마켓에서 장바구니를 채우듯 즐겁게 모아보세요. Carefully prescribed,
              freshly picked for Abigail.
            </motion.p>
            <motion.div className="hero-actions" variants={rise}>
              <button className="btn primary" type="button" onClick={scrollToCollections}>
                컬렉션 보기 <span className="arrow">→</span>
              </button>
              <button className="btn ghost" type="button" onClick={onOpenAdd}>
                제품 추가하기 <span aria-hidden="true">＋</span>
              </button>
            </motion.div>
            <motion.div className="stats" variants={rise}>
              <div className="stat">
                <b>
                  <AnimatedNumber value={4} />
                </b>
                <span>curated collections</span>
              </div>
              <div className="stat">
                <b>
                  <AnimatedNumber value={totalCount} />
                </b>
                <span>freshly picked finds</span>
              </div>
              <div className="stat">
                <b>
                  <AnimatedNumber value={1} />
                </b>
                <span>pharmer's market</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="stage"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="stage-frame">
              <span className="ring r1">
                <span className="node" />
              </span>
              <span className="ring r2">
                <span className="node" />
              </span>
              <span className="ring r3">
                <span className="node" />
              </span>
              <span className="core">
                <span className="core-live">
                  <i />
                  Live index
                </span>
                <img src="./favicon.svg" alt="" />
                <b>Curation for Abigail</b>
                <small>prescribed · freshly picked</small>
              </span>
            </div>
            <Chip cls="c1" type="necklace" label="Necklaces" sub="Soft metallic drops" />
            <Chip cls="c2" type="watch" label="Watches" sub="Petite oval classics" />
            <Chip cls="c3" type="lens" label="Lenses" sub="Sony E-mount" />
            <Chip cls="c4" type="scrub" label="Scrubs" sub="FIGS edit" />
          </motion.div>
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k}>
              CAREFULLY PRESCRIBED <i>✦</i> FRESHLY PICKED <i>✦</i> NECKLACES <i>✦</i> WATCHES <i>✦</i> LENSES{" "}
              <i>✦</i> SCRUBS <i>✦</i> CURATED FOR ABIGAIL <i>✦</i>{" "}
            </span>
          ))}
        </div>
      </div>

      <section className="container" id="home-collections" style={{ padding: "clamp(30px,5vw,60px) 0 clamp(90px,12vw,150px)" }}>
        <div className="home-head">
          <div>
            <p className="eyebrow">Fresh from the curation patch</p>
            <h2>오늘의 수확물을 골라보세요.</h2>
          </div>
        </div>
        <motion.div
          className="bento"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {CATS.map((cat) => {
            const count = collections[cat.route].items.length;
            return (
              <motion.button
                className="cat"
                type="button"
                key={cat.route}
                variants={rise}
                onClick={() => go(cat.route)}
              >
                <span className="cat-art">
                  <FallbackIcon type={cat.type} />
                </span>
                <span className="cat-copy">
                  <small>{count} curated picks</small>
                  <strong>{cat.label}</strong>
                  <span className="row">
                    {cat.tag} <b>→</b>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </section>
    </section>
  );
}
