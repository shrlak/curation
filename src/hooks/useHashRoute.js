import { useCallback, useEffect, useState } from "react";

const clean = (hash) => (hash || "").replace(/^#/, "") || "home";

export function useHashRoute() {
  const [route, setRoute] = useState(() => clean(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(clean(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next, { scroll = true } = {}) => {
    const target = next || "home";
    if (clean(window.location.hash) !== target) {
      window.location.hash = target;
    }
    setRoute(target);
    if (scroll) {
      const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  }, []);

  return [route, go];
}
