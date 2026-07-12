import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "abigail-favorites";

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function useFavorites(notify) {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids]);

  const has = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id) => {
      setIds((prev) => {
        const on = prev.includes(id);
        notify?.(on ? "Removed from saved list." : "Added to saved list.");
        return on ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [notify],
  );

  const remove = useCallback((id) => setIds((prev) => prev.filter((x) => x !== id)), []);

  return useMemo(() => ({ ids, count: ids.length, has, toggle, remove }), [ids, has, toggle, remove]);
}
