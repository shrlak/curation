import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { icons } from "./icons.jsx";

const isMobileViewport = () => window.matchMedia("(max-width: 720px)").matches;

const BASE_TABS = [
  { route: "home", label: "Home", icon: "home" },
  { route: "necklaces", label: "Necklaces", icon: "necklace" },
  { route: "watches", label: "Watches", icon: "watch" },
  { route: "lenses", label: "Lenses", icon: "lens" },
  { route: "scrubs", label: "Scrubs", icon: "scrub" },
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
  const [menuOpen, setMenuOpen] = useState(false);

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
  const tabs = [...BASE_TABS, ...custom];

  const selectTab = (route) => {
    go(route);
    setMenuOpen(false);
  };

  const onBrandClick = () => {
    if (isMobileViewport()) setMenuOpen(true);
    else go("home");
  };

  return (
    <header className="header">
      <nav className="nav" aria-label="Main navigation">
        <button className="brand" type="button" onClick={onBrandClick} aria-label="Home and site menu">
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
          <button className="icon-btn" type="button" onClick={onOpenCart} aria-label="Open saved list">
            {icons.heart}
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

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="overlay drawer nav-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.aside
              className="drawer-panel nav-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="drawer-head">
                <h2>Menu</h2>
                <button className="icon-btn" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  {icons.close}
                </button>
              </div>
              <ul className="nav-menu-list">
                {tabs.map((tab) => (
                  <li key={tab.route}>
                    <button
                      className="nav-menu-item"
                      type="button"
                      data-active={route === tab.route}
                      aria-current={route === tab.route ? "page" : undefined}
                      onClick={() => selectTab(tab.route)}
                    >
                      {icons[tab.icon] || icons.folder}
                      <span>{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
