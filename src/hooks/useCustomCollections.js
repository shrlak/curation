import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProductPhoto,
  loadCollections,
  saveCollections,
  storeProductPhoto,
  uid,
} from "../lib/customCollections.js";

export function useCustomCollections(notify) {
  const [collections, setCollections] = useState(loadCollections);

  useEffect(() => {
    saveCollections(collections);
  }, [collections]);

  const addProduct = useCallback(
    async ({ categoryName, productName, price, note, url, image, photoFile }) => {
      const itemId = uid();
      const imageKey = photoFile ? `photo-${itemId}` : "";
      if (photoFile) await storeProductPhoto(imageKey, photoFile);

      let createdId = null;
      let isNew = false;
      setCollections((prev) => {
        const next = prev.map((c) => ({ ...c, items: [...c.items] }));
        let category = next.find(
          (item) => item.name.localeCompare(categoryName, undefined, { sensitivity: "accent" }) === 0,
        );
        if (!category) {
          isNew = true;
          category = { id: `custom-${uid()}`, name: categoryName, items: [] };
          next.push(category);
        }
        createdId = category.id;
        category.items.unshift({
          id: itemId,
          name: productName,
          url,
          price: String(price || "").trim(),
          note: String(note || "").trim(),
          image: photoFile ? "" : image || "",
          imageKey,
          imageName: photoFile?.name || "",
          addedAt: Date.now(),
        });
        return next;
      });
      notify?.(isNew ? `“${categoryName}” 탭을 만들고 제품을 추가했어요.` : `“${categoryName}”에 제품을 추가했어요.`);
      return createdId;
    },
    [notify],
  );

  const removeProduct = useCallback(
    async (categoryId, itemId) => {
      let removedCategory = false;
      const category = collections.find((c) => c.id === categoryId);
      const removed = category?.items.find((item) => item.id === itemId);
      if (removed?.imageKey) await deleteProductPhoto(removed.imageKey);
      setCollections((prev) => {
        const next = prev
          .map((c) => (c.id === categoryId ? { ...c, items: c.items.filter((item) => item.id !== itemId) } : c))
          .filter((c) => {
            if (c.id === categoryId && c.items.length === 0) {
              removedCategory = true;
              return false;
            }
            return true;
          });
        return next;
      });
      notify?.(removedCategory ? "마지막 제품을 삭제해 컬렉션 탭도 정리했어요." : "제품을 컬렉션에서 삭제했어요.");
      return removedCategory;
    },
    [collections, notify],
  );

  const names = useMemo(() => collections.map((c) => c.name), [collections]);

  return { collections, addProduct, removeProduct, names };
}
