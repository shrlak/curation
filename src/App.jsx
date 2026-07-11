import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Background from "./components/Background.jsx";
import Nav from "./components/Nav.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./components/Home.jsx";
import Collection from "./components/Collection.jsx";
import CustomView from "./components/CustomView.jsx";
import QuickView from "./components/QuickView.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import CustomCollectionDialog from "./components/CustomCollectionDialog.jsx";
import Toast from "./components/Toast.jsx";
import { About, Acknowledgements, Contact } from "./components/InfoPages.jsx";

import { useHashRoute } from "./hooks/useHashRoute.js";
import { useTheme } from "./hooks/useTheme.js";
import { useFavorites } from "./hooks/useFavorites.js";
import { useColors } from "./hooks/useColors.js";
import { useCustomCollections } from "./hooks/useCustomCollections.js";

const COLLECTION_ROUTES = ["necklaces", "watches", "lenses", "scrubs"];
const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export default function App() {
  const [route, go] = useHashRoute();
  const { theme, toggle } = useTheme();

  const toastTimer = useRef(0);
  const [toast, setToast] = useState("");
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2300);
  }, []);

  const favorites = useFavorites(notify);
  const { colorOf, setColor } = useColors();
  const { collections: customCollections, addProduct, removeProduct, names } = useCustomCollections(notify);

  const handleColor = useCallback(
    (product, color) => {
      setColor(product, color);
      notify(`${product.name}: ${color} selected.`);
    },
    [setColor, notify],
  );

  const [quick, setQuick] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [addDialog, setAddDialog] = useState({ open: false, category: "" });
  const openAdd = useCallback((category = "") => setAddDialog({ open: true, category }), []);

  const handleRemove = useCallback(
    async (categoryId, itemId) => {
      const removedCategory = await removeProduct(categoryId, itemId);
      if (removedCategory && route === categoryId) go("home");
    },
    [removeProduct, route, go],
  );

  const customCategory = useMemo(
    () => customCollections.find((c) => c.id === route),
    [customCollections, route],
  );

  const view = useMemo(() => {
    if (COLLECTION_ROUTES.includes(route)) {
      return (
        <Collection
          collectionKey={route}
          favorites={favorites}
          onToggleFav={favorites.toggle}
          onQuick={setQuick}
          colorOf={colorOf}
          setColor={handleColor}
        />
      );
    }
    if (route === "about") return <About />;
    if (route === "acknowledgements") return <Acknowledgements />;
    if (route === "contact") return <Contact notify={notify} />;
    if (customCategory) return <CustomView category={customCategory} onRemove={handleRemove} onAdd={openAdd} />;
    return <Home go={go} onOpenAdd={() => openAdd()} />;
  }, [route, favorites, colorOf, handleColor, notify, customCategory, handleRemove, openAdd, go]);

  return (
    <>
      <Background />
      <a className="skip" href="#main">
        본문으로 건너뛰기
      </a>
      <Nav
        route={route}
        go={go}
        favoriteCount={favorites.count}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdd={() => openAdd()}
        theme={theme}
        toggleTheme={toggle}
        customTabs={customCollections.map((c) => ({ id: c.id, name: c.name }))}
      />

      <main id="main">
        <AnimatePresence mode="wait">
          <motion.div key={route} {...pageMotion}>
            {view}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer go={go} />

      <QuickView product={quick} onClose={() => setQuick(null)} colorOf={colorOf} setColor={handleColor} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        favoriteIds={favorites.ids}
        onRemove={favorites.remove}
        colorOf={colorOf}
      />
      <CustomCollectionDialog
        open={addDialog.open}
        initialCategory={addDialog.category}
        onClose={() => setAddDialog({ open: false, category: "" })}
        onSubmit={addProduct}
        names={names}
        onNavigate={(id) => id && go(id)}
      />
      <Toast message={toast} />
    </>
  );
}
