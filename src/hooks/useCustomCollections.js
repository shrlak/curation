import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addProductDoc,
  addTabDoc,
  compressImageToDataUrl,
  deleteProductDoc,
  deleteTabDoc,
  migrateLocalCollections,
  subscribeCollections,
  uid,
} from "../lib/customCollections.js";

export function useCustomCollections(notify) {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    migrateLocalCollections();
    return subscribeCollections(setCollections);
  }, []);

  const addProduct = useCallback(
    async ({ categoryName, productName, price, note, url, image, photoFile }) => {
      const itemId = uid();
      const photoImage = photoFile ? await compressImageToDataUrl(photoFile) : "";

      const category = collections.find(
        (c) => c.name.localeCompare(categoryName, undefined, { sensitivity: "accent" }) === 0,
      );
      const isNew = !category;
      const tabId = category?.id || `custom-${uid()}`;
      if (isNew) await addTabDoc(tabId, categoryName);

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

      notify?.(isNew ? `“${categoryName}” 탭을 만들고 제품을 추가했어요.` : `“${categoryName}”에 제품을 추가했어요.`);
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

  const names = useMemo(() => collections.map((c) => c.name), [collections]);

  return { collections, addProduct, removeProduct, names };
}
