import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { icons } from "./icons.jsx";

const BASE_TABS = [
  { route: "home", label: "Home", icon: "home" },
  { route: "necklaces", label: "Necklaces", icon: "necklace" },
  { route: "watches", label: "Watches", icon: "watch" },
  { route: "lenses", label: "Lenses", icon: "lens" },
  { route: "scrubs", label: "Scrubs", icon: "scrub" },
];
const TAIL_TABS = [
  { route: "about", label: "About", icon: "about" },
  { route: "acknowledgements", label: "Acknowledgements", icon: "ack" },
  { route: "contact", label: "Contact", icon: "contact" },
];

function Tab({ tab, active, onClick }) {
  return (
    <button className="tab" type="button" data-active={active} onClick={onClick} aria-current={active ? "page" : undefined}>
      {active && (
        <motion.span
          className="tab-pill"
          layoutId="tab-pill"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      {icons[tab.icon] || icons.folder}
      <span>{tab.label}</span>
    </button>
  );
}

export default function Nav({ route, go, favoriteCount, onOpenCart, onOpenAdd, theme, toggleTheme, customTabs }) {
  const progressRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const value = max > 0 ? scrollY / max : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${value})`;
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  const custom = customTabs.map((c) => ({ route: c.id, label: c.name, icon: "folder" }));
  const tabs = [...BASE_TABS, ...custom, ...TAIL_TABS];

  return (
    <header className="header">
      <nav className="nav" aria-label="Main navigation">
        <button className="brand" type="button" onClick={() => go("home")} aria-label="Home">
          <span className="brand-mark" aria-hidden="true">
            <img src="./favicon.svg" alt="" />
          </span>
          <span className="brand-name">
            <b>CURATION</b>
            <span>for Abigail</span>
          </span>
        </button>

        <div className="tabs" role="tablist">
          {tabs.map((tab) => (
            <Tab key={tab.route} tab={tab} active={route === tab.route} onClick={() => go(tab.route)} />
          ))}
        </div>

        <div className="nav-actions">
          <button className="icon-btn" type="button" onClick={onOpenAdd} aria-label="Add a product or collection">
            {icons.add}
          </button>
          <button className="icon-btn" type="button" onClick={onOpenCart} aria-label="Open cart">
            {icons.cart}
            {favoriteCount > 0 && <span className="count-badge">{favoriteCount}</span>}
          </button>
          <button className="icon-btn theme-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
            {icons.sun}
            {icons.moon}
          </button>
        </div>
      </nav>
      <div className="progress">
        <span ref={progressRef} />
      </div>
    </header>
  );
}
