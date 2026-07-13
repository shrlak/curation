import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUILTIN_TABS,
  addProductDoc,
  addTabDoc,
  compressImageToDataUrl,
  deleteProductDoc,
  deleteTabDoc,
  migrateLocalCollections,
  subscribeCollections,
  uid,
} from "../lib/customCollections.js";

const BUILTIN_TABS_LOWER = new Map(
  Object.entries(BUILTIN_TABS).map(([label, route]) => [label.toLowerCase(), route]),
);

export function useCustomCollections(notify) {
  const [collections, setCollections] = useState([]);
  const [builtinItems, setBuiltinItems] = useState({});

  useEffect(() => {
    migrateLocalCollections();
    return subscribeCollections((next) => {
      setCollections(next.collections);
      setBuiltinItems(next.builtinItems);
    });
  }, []);

  const addProduct = useCallback(
    async ({ categoryName, productName, price, note, url, image, photoFile }) => {
      const itemId = uid();
      const photoImage = photoFile ? await compressImageToDataUrl(photoFile) : "";

      const category = collections.find(
        (c) => c.name.localeCompare(categoryName, undefined, { sensitivity: "accent" }) === 0,
      );
      const builtinRoute = category ? null : BUILTIN_TABS_LOWER.get(categoryName.toLowerCase());
      const isNewTab = !category && !builtinRoute;
      const tabId = category?.id || builtinRoute || `custom-${uid()}`;
      if (isNewTab) await addTabDoc(tabId, categoryName);

      await addProductDoc(itemId, {
        tabId,
        name: productName,
        url,
        price: String(price || "").trim(),
        note: String(note || "").trim(),
        image: photoFile ? photoImage : image || "",
        imageName: photoFile?.name || "",
        addedAt: Date.now(),
      });

      notify?.(isNewTab ? `“${categoryName}” 탭을 만들고 제품을 추가했어요.` : `“${categoryName}”에 제품을 추가했어요.`);
      return tabId;
    },
    [collections, notify],
  );

  const removeProduct = useCallback(
    async (categoryId, itemId) => {
      const category = collections.find((c) => c.id === categoryId);
      const removedCategory = category?.items.length === 1;
      await deleteProductDoc(itemId);
      if (removedCategory) await deleteTabDoc(categoryId);
      notify?.(removedCategory ? "마지막 제품을 삭제해 컬렉션 탭도 정리했어요." : "제품을 컬렉션에서 삭제했어요.");
      return removedCategory;
    },
    [collections, notify],
  );

  const removeBuiltinProduct = useCallback(
    async (itemId) => {
      await deleteProductDoc(itemId);
      notify?.("제품을 삭제했어요.");
    },
    [notify],
  );

  const names = useMemo(() => collections.map((c) => c.name), [collections]);

  return { collections, addProduct, removeProduct, names, builtinItems, removeBuiltinProduct };
}
