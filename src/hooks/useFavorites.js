import { useCallback, useEffect, useMemo, useState } from "react";
import { addFavoriteDoc, migrateLocalFavorites, removeFavoriteDoc, subscribeFavorites } from "../lib/favorites.js";

export function useFavorites(notify) {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    migrateLocalFavorites();
    return subscribeFavorites(setIds);
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id) => {
      const on = ids.includes(id);
      notify?.(on ? "Removed from saved list." : "Added to saved list.");
      if (on) removeFavoriteDoc(id);
      else addFavoriteDoc(id);
    },
    [ids, notify],
  );

  const remove = useCallback((id) => removeFavoriteDoc(id), []);

  return useMemo(() => ({ ids, count: ids.length, has, toggle, remove }), [ids, has, toggle, remove]);
}
