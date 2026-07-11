import { COLOR_HEX, colorsFor } from "../data/index.js";

export default function ColorSwatches({ product, selected, onSelect, compact }) {
  const colors = colorsFor(product);
  if (colors.length <= 1) return null;
  return (
    <div className={`swatches ${compact ? "compact" : ""}`} role="group" aria-label={`Choose ${product.name} color`}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ "--sw": COLOR_HEX[color] || "#b7b7bc" }}
          data-on={color === selected}
          aria-label={color}
          title={color}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(color);
          }}
        />
      ))}
    </div>
  );
}
