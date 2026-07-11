import { useCallback, useEffect, useState } from "react";
import { colorsFor } from "../data/index.js";

const KEY = "abigail-product-colors-v2";
const productKey = (product) => product.slug || product.name;

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
};

export function useColors() {
  const [selected, setSelected] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(selected));
    } catch {
      /* ignore */
    }
  }, [selected]);

  const colorOf = useCallback(
    (product) => {
      const choices = colorsFor(product);
      const saved = selected[productKey(product)];
      return choices.includes(saved) ? saved : choices[0] || "Black";
    },
    [selected],
  );

  const setColor = useCallback((product, color) => {
    setSelected((prev) => ({ ...prev, [productKey(product)]: color }));
  }, []);

  return { colorOf, setColor };
}
