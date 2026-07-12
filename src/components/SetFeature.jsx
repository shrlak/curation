import ProductImage from "./ProductImage.jsx";
import ColorSwatches from "./ColorSwatches.jsx";
import { variantUrl } from "../data/index.js";

const httpsOnly = (url) => (/^https:\/\//i.test(String(url)) ? url : "#");

export default function SetFeature({ product, color, onColor }) {
  if (!product) return null;
  const pantsUrl = variantUrl(product, color);
  const topUrl = variantUrl(product, color, true);

  return (
    <article className="set panel">
      <ProductImage
        className="set-media"
        pageUrl={pantsUrl}
        imageUrl={product.image}
        preferRemote
        alt={`${product.name} in ${color}`}
        type="scrub"
        fit="cover"
      >
        <span className="badge accent set-badge">Wide-leg option</span>
      </ProductImage>
      <div className="set-copy">
        <p className="eyebrow">FIGS · THE SET</p>
        <h2>
          THE SET,
          <br />
          now in wide-leg.
        </h2>
        <p className="kw">
          슬림 Catarina One-Pocket 상의와 High Waisted Isabel Wide-Leg 팬츠를 같은 컬러로 매치한 조합입니다. 아래 컬러를
          선택하면 제품 이미지와 구매 링크가 함께 바뀝니다.
        </p>
        <div className="set-picker">
          <div className="color-copy">
            <span>Selected color</span>
            <strong>{color}</strong>
          </div>
          <ColorSwatches product={product} selected={color} onSelect={(c) => onColor(product, c)} />
        </div>
        <div className="set-actions">
          <a className="btn primary" href={httpsOnly(pantsUrl)} target="_blank" rel="noopener noreferrer">
            Shop Isabel pants <span className="arrow">↗</span>
          </a>
          <a className="btn ghost" href={httpsOnly(topUrl)} target="_blank" rel="noopener noreferrer">
            Shop matching top <span className="arrow">↗</span>
          </a>
        </div>
        <small className="set-note">Color and size availability can change on FIGS.</small>
      </div>
    </article>
  );
}
