#!/usr/bin/env python3
import csv
import html
import io
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(sys.argv[1]).resolve()
OUT = ROOT / "public" / "products"
OUT.mkdir(parents=True, exist_ok=True)

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
)

# Product-only image assets used when retailer pages do not expose usable
# metadata (or block automated page/image requests). These are normalized into
# the repository cache by this script, so the live app never hotlinks them.
IMAGE_OVERRIDES = {
    "watch-1": "https://cdna.lystit.com/520/650/n/photos/macys/65532e15/rosefield-designer-Silver-Mini-Oval-Tone-Stainless-Steel-Bracelet-Watch-22mm.jpeg",
    "watch-4": "https://anneklein.com/cdn/shop/files/AK-5326RGRG_5c3382cc-65d2-4bfd-985c-74c91336e2f5_2048x.jpg?v=1755806048",
    "watch-5": "https://anneklein.com/cdn/shop/files/AK-5327SVTT_2048x.jpg?v=1759867773",
    "watch-6": "https://anneklein.com/cdn/shop/files/AK-5021SVTT_2048x.jpg?v=1755269065",
    "watch-7": "https://anneklein.com/cdn/shop/files/AK-5154SVYL_2048x.jpg?v=1755268952",
    "watch-8": "https://editorialist.com/thumbnail/1200/2026/1/040/359/745/40359745~silvermother%20of%20pearl_1779283371617_0.webp?quality=100&width=1200",
    "watch-9": "https://s7.toryburch.com/is/image/ToryBurch/style/elongated-oval-watch-front.TB_185731_000_SLFRO.pdp-767x872.jpg",
    "watch-10": "https://www.kay.com/productimages/processed/V-331799104_0_800.jpg?pristine=true",
    "watch-12": "https://www.kay.com/productimages/processed/V-331800300_0_800.jpg?pristine=true",
    "watch-13": "https://slimages.macysassets.com/is/image/MCY/products/3/optimized/22992373_fpx.tif",
    "watch-14": "https://www.reeds.com/media/catalog/product/cache/38c3c1b8e53ef11aa9803a5390245afc/c/o/coach_elliot_white_sunray_dial_mesh_stainless_steel_bracelet_watch_36mm-14504207-1-14504207-hxf8172fb5.jpg",
    "watch-15": "https://www.kay.com/productimages/processed/V-331502207_0_800.jpg?pristine=true",
    "watch-18": "https://www.zales.com/productimages/processed/V-20598112_0_800.jpg?pristine=true",
    "watch-19": "https://dimg.dillards.com/is/image/DillardsZoom/alt/coach-womens-sammy-quartz-analog-gold-tone-stainless-steel-bracelet-watch/00000000_zi_f00c5e6d-3203-474b-84cd-6edac360529d.jpg",
    "watch-21": "https://production.atgwasl.com/dw/image/v2/BDSP_PRD/on/demandware.static/-/Sites-coach-master-catalog/default/dwb84d3105/sfcc-coach-production/2/1/8/6/1/218616830_E1.jpg?sw=1000&sh=1250&q=90",
    "watch-22": "https://slimages.macysassets.com/is/image/MCY/products/2/optimized/28662402_fpx.tif",
    "watch-23": "https://dimg.dillards.com/is/image/DillardsZoom/alt/coach-womens-sammy-quartz-analog-stainless-steel-mesh-bracelet-watch/00000001_zi_32d2b504-0114-4a15-a065-1514c0a1f084.jpg",
    "watch-25": "https://dimg.dillards.com/is/image/DillardsZoom/alt/olivia-burton-womens-finer-quartz-analog-stainless-steel-mesh-bracelet-watch/00000000_zi_4520bc51-87cc-4838-b26b-7c53e380ec9d.jpg",
    "watch-29": "https://slimages.macysassets.com/is/image/MCY/products/8/optimized/35417478_fpx.tif",
    "watch-30": "https://dimg.dillards.com/is/image/DillardsZoom/alt/movado-womens-museum-oval-quartz-analog-stainless-steel-bangle-bracelet-watch/00000000_zi_cec4f5fe-5941-4fd8-a014-6a9202694270.jpg",
    "watch-31": "https://watch-connection.com/cdn/shop/files/imgi_113_61qBdp2KBrL._AC_SL1500.jpg?v=1758580980",
    "watch-32": "https://www.hollandwatchgroup.com/pictures/daniel-wellington-dw00100890-ophelia-mini-19226477.jpg",
    "watch-34": "https://www.bijourama.com/media/produits/lacoste/img/montre-lacoste--femme-2001453_3690217_1140x1140.jpg",
    "watch-35": "https://www.zales.com/productimages/processed/V-20349509_0_800.jpg?pristine=true",
    "watch-37": "https://dimg.dillards.com/is/image/DillardsZoom/alt/movado-womens-museum-oval-quartz-analog-stainless-steel-bangle-bracelet-watch/00000000_zi_cec4f5fe-5941-4fd8-a014-6a9202694270.jpg",
    "lens-1": "https://www.fujiya-camera.co.jp/img/goods/L/C4548736131187_l.jpg",
    "lens-2": "https://d1uzk9o9cg136f.cloudfront.net/f/16783155/rc/2020/02/26/f6dfcdf30539ec7d7243a1e9cf2bc514559fba64_large.jpg",
    "lens-3": "https://bizweb.dktcdn.net/thumb/1024x1024/100/507/659/products/ong-kinh-sony-fe-24mm-f1-4-gm-hang-chinh-hang.jpg?v=1709714447990",
    "lens-4": "https://www.fotopro.es/26402-large_default/sigma-24mm-f-14-dg-dn-art.jpg",
    "lens-6": "https://cdn11.bigcommerce.com/s-745x53acpn/images/stencil/1280x1280/products/8543/38302/20260107_Sony_TITU_Jan1_Mar31_Web_Pic_10467__84654.1767830258.jpg?c=2",
    "lens-7": "https://www.sony.com.au/image/4f8ed826f02307ff822d4ab29ff6220f?fmt=png-alpha&wid=480",
    "lens-8": "https://cdn.webshopapp.com/shops/254654/files/368504290/800x1024x2/sigma-sigma-35mm-f14-dg-dn-art-sony-e-mount.jpg",
    "lens-9": "https://www.photonet.cz/image/catalog/viltrox-af-35mm-f1-8-fe-sony_99.jpg",
    "lens-10": "https://dukefotografia.com/65025-home_default/sony-objetivo-fe-50mm-f12-gm-sel50f12gm-sony.jpg",
    "lens-11": "https://microless.com/cdn/products/e337e598f113b2b3d829429a26257f31-hi.jpg",
    "lens-12": "https://omaxphoto.com/cdn/shop/files/50mm1.4sigma2.jpg?v=1741433399&width=5000",
    "lens-13": "https://dukefotografia.com/59431-home_default/viltrox-af-50mm-f18-fe-sony-full-frame-viltrox.jpg",
    "lens-14": "https://www.fotofenice.com/35324-large_default/obiettivo-ttartisan-50mm-f2-per-mirrorless-sony-e.jpg",
    "lens-15": "https://cdn.shopify.com/s/files/1/0672/3806/8470/files/LensaTTArtisanTilt50mmf1.47_e34ff733-4536-4148-b2b4-a34dedb0a5b9.jpg?v=1718001553",
    "lens-16": "https://fstudio.vtexassets.com/arquivos/ids/672105-1200-1200?aspect=true&height=1200&width=1200",
    "lens-17": "https://www.camera-warehouse.com.au/media/catalog/product/cache/4c60323fdbce02b8f1d369b207d25a05/s/o/sony_sel85f14gm2_1.jpg",
    "lens-18": "https://cdn.uniquephoto.com/resources/uniquephoto/images/products/processed/SGL322965.superZoom.a.jpg",
    "lens-19": "https://www.cameraland.nl/media/catalog/product/v/i/viltrox-af-85mm-1-8-xfii-fuji-x_1_1.jpg",
    "lens-20": "https://samyangus.com/cdn/shop/products/Rokinon_IO75AF-E_1.jpg?v=1600437281&width=1080",
    "lens-21": "https://img-cdn.heureka.group/v1/67ab9006-1bfb-433b-a12d-e4660f601f0d.jpg?height=1200&width=1200",
    "lens-22": "https://viltroxjapan.jp/cdn/shop/files/4573620730320_2e33fece-1449-4b28-8ea7-a37ab665b069.jpg?v=1738918238&width=1946",
    "lens-23": "https://prophotosupply.com/cdn/shop/files/SEL1635GM2_A-3000px.png?v=1693339214&width=1946",
    "lens-24": "https://media.foto-erhardt.de/images/product_images/original_images/248/sigma-16-28mm-f28-dg-dn-c-sony-e-165414924724810304.jpg",
    "lens-25": "https://static01.galaxus.com/productimages/3/6/1/3/6/4/5/2/Tamron-17-28mm-III-RXD-A046-cover.jpg_720.jpeg",
    "lens-26": "https://i.ebayimg.com/images/g/GhsAAOSwgVtkkIKo/s-l1600.webp",
    "lens-27": "https://cdn.uniquephoto.com/resources/uniquephoto/images/products/processed/SGL57A965.superZoom.g.jpg",
    "lens-28": "https://www.tamron.com/jp/consumer/pc_file/file/a063_main.webp",
    "lens-29": "https://dtz3um9jw7ngl.cloudfront.net/p/l/9245024S/9245024S.jpg",
    "lens-30": "https://www.fujiya-camera.co.jp/img/goods/L/C4960371006703_l.jpg",
    "lens-31": "https://i.ebayimg.com/images/g/hpYAAeSwrKto~v3n/s-l1600.jpg",
    "lens-32": "https://www.tamron.com/jp/consumer/pc_file/file/a065_main.webp",
    "lens-33": "https://fotocuratolo.it/prodotti/3533/XXL/3533foto.jpg",
    "lens-34": "https://www.kamera-express.nl/media/9e75f3ab-16b0-44a7-9f67-2e90954485de/samyang-af-35-150mm-f-2-2-8-sony-fe.jpg",
}


class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.in_ld = False
        self.ld_parts = []

    def handle_starttag(self, tag, attrs):
        attrs = {k.lower(): v for k, v in attrs if k and v}
        if tag.lower() == "meta":
            key = (attrs.get("property") or attrs.get("name") or "").lower()
            if key in {
                "og:image",
                "og:image:url",
                "twitter:image",
                "twitter:image:src",
            }:
                self.images.append(attrs.get("content", ""))
        elif tag.lower() == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self.in_ld = True
            self.ld_parts = []

    def handle_data(self, data):
        if self.in_ld:
            self.ld_parts.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "script" and self.in_ld:
            self.in_ld = False
            raw = "".join(self.ld_parts).strip()
            try:
                value = json.loads(raw)
            except Exception:
                return
            self._collect_json_images(value)

    def _collect_json_images(self, value):
        if isinstance(value, dict):
            image = value.get("image")
            if isinstance(image, str):
                self.images.append(image)
            elif isinstance(image, list):
                self.images.extend(item for item in image if isinstance(item, str))
            elif isinstance(image, dict):
                candidate = image.get("url") or image.get("contentUrl")
                if isinstance(candidate, str):
                    self.images.append(candidate)
            for child in value.values():
                if isinstance(child, (dict, list)):
                    self._collect_json_images(child)
        elif isinstance(value, list):
            for child in value:
                self._collect_json_images(child)


def fetch(url, *, referer=None, timeout=20, max_bytes=None):
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/json,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if referer:
        headers["Referer"] = referer
    request = Request(url, headers=headers)
    with urlopen(request, timeout=timeout) as response:
        data = response.read(max_bytes or 12_000_000)
        return data, response.headers.get("Content-Type", ""), response.geturl()


def parse_tsv(path, type_name):
    with path.open(encoding="utf-8", newline="") as handle:
        rows = csv.DictReader(handle, delimiter="\t")
        return [
            {
                "id": f"{type_name}-{index}",
                "name": row.get("name", ""),
                "url": row.get("url", ""),
            }
            for index, row in enumerate(rows, 1)
        ]


def parse_necklaces(path):
    text = path.read_text(encoding="utf-8")
    products = []
    for block in re.findall(r"\{\s*(.*?)\s*\},?", text, flags=re.S):
        fields = {}
        for key in ("id", "name", "url"):
            match = re.search(rf'{key}:\s*"((?:\\.|[^"\\])*)"', block, flags=re.S)
            if match:
                fields[key] = json.loads(f'"{match.group(1)}"')
        if all(fields.get(key) for key in ("id", "name", "url")):
            products.append(fields)
    return products


def page_metadata_images(page_url):
    data, content_type, final_url = fetch(page_url, timeout=20, max_bytes=4_000_000)
    if "html" not in content_type.lower() and not data.lstrip().startswith(b"<"):
        return [], final_url, f"unexpected page type {content_type}"
    parser = MetadataParser()
    parser.feed(data.decode("utf-8", errors="ignore"))
    candidates = []
    for raw in parser.images:
        value = html.unescape(str(raw)).strip()
        if value:
            absolute = urljoin(final_url, value)
            if absolute.startswith("https://") and absolute not in candidates:
                candidates.append(absolute)
    return candidates, final_url, ""


def microlink_image(page_url):
    endpoint = f"https://api.microlink.io/?url={quote(page_url, safe='')}&meta=true"
    data, _, _ = fetch(endpoint, timeout=30, max_bytes=2_000_000)
    payload = json.loads(data.decode("utf-8"))
    image = ((payload.get("data") or {}).get("image") or {}).get("url")
    return image if isinstance(image, str) and image.startswith("https://") else ""


def save_thumbnail(product, image_url, referer):
    data, content_type, _ = fetch(image_url, referer=referer, timeout=30, max_bytes=20_000_000)
    if not content_type.lower().startswith("image/") and data[:4] not in (b"RIFF", b"\x89PNG") and data[:2] != b"\xff\xd8":
        raise ValueError(f"not an image ({content_type})")
    with Image.open(io.BytesIO(data)) as source:
        source.seek(0)
        frame = source.convert("RGBA")
        contained = ImageOps.contain(frame, (900, 900), method=Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (900, 900), (255, 255, 255, 255))
        x = (900 - contained.width) // 2
        y = (900 - contained.height) // 2
        if contained.mode == "RGBA":
            canvas.alpha_composite(contained, (x, y))
        else:
            canvas.paste(contained, (x, y))
        output = OUT / f"{product['id']}.webp"
        canvas.convert("RGB").save(output, "WEBP", quality=84, method=6)
    return output


def process(product):
    cached = OUT / f"{product['id']}.webp"
    if cached.exists():
        try:
            with Image.open(cached) as image:
                image.verify()
            return {
                **product,
                "ok": True,
                "file": str(cached.relative_to(ROOT)),
                "source": "repository cache",
                "errors": [],
            }
        except Exception:
            cached.unlink(missing_ok=True)

    errors = []
    candidates = []
    final_url = product["url"]
    override = IMAGE_OVERRIDES.get(product["id"])
    if override:
        candidates.append((override, "curated product image"))
    try:
        direct, final_url, warning = page_metadata_images(product["url"])
        candidates.extend(
            (url, "page metadata")
            for url in direct
            if all(url != candidate for candidate, _ in candidates)
        )
        if warning:
            errors.append(warning)
    except Exception as exc:
        errors.append(f"page: {type(exc).__name__}: {exc}")

    try:
        micro = microlink_image(product["url"])
        if micro and all(micro != url for url, _ in candidates):
            candidates.append((micro, "microlink metadata"))
    except Exception as exc:
        errors.append(f"microlink: {type(exc).__name__}: {exc}")

    for image_url, source in candidates:
        try:
            image_referer = final_url
            if source == "curated product image":
                parsed = urlparse(image_url)
                image_referer = f"{parsed.scheme}://{parsed.netloc}/"
            output = save_thumbnail(product, image_url, image_referer)
            return {
                **product,
                "ok": True,
                "file": str(output.relative_to(ROOT)),
                "image_url": image_url,
                "source": source,
                "errors": errors,
            }
        except Exception as exc:
            errors.append(f"image {image_url[:120]}: {type(exc).__name__}: {exc}")

    return {**product, "ok": False, "errors": errors, "candidates": [url for url, _ in candidates]}


def main():
    products = []
    products.extend(parse_necklaces(ROOT / "src/data/necklaces.js"))
    products.extend(parse_tsv(ROOT / "src/data/watches.tsv", "watch"))
    products.extend(parse_tsv(ROOT / "src/data/lenses.tsv", "lens"))
    products.extend(parse_tsv(ROOT / "src/data/scrubs.tsv", "scrub"))
    print(f"Auditing {len(products)} products", flush=True)

    results = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(process, product): product for product in products}
        for completed, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            marker = "OK" if result["ok"] else "MISS"
            print(f"[{completed:02d}/{len(products)}] {marker} {result['id']} {result['name']}", flush=True)
            time.sleep(0.05)

    results.sort(key=lambda item: item["id"])
    report = ROOT / "scripts" / "product-image-audit.json"
    report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = ROOT / "src" / "data" / "product-images.js"
    entries = [
        f'  "{result["id"]}": "products/{result["id"]}.webp",'
        for result in results
        if result["ok"]
    ]
    manifest.write_text(
        "// Generated by scripts/cache_product_images.py.\n"
        "export const productImages = Object.freeze({\n"
        + "\n".join(entries)
        + "\n});\n\n"
        "export const productImageFor = (id) => {\n"
        "  const path = productImages[id];\n"
        "  return path ? `${import.meta.env.BASE_URL}${path}` : \"\";\n"
        "};\n",
        encoding="utf-8",
    )
    good = sum(1 for result in results if result["ok"])
    missing = [result["id"] for result in results if not result["ok"]]
    print(f"Cached {good}/{len(results)} images; report: {report}")
    print("Missing: " + (", ".join(missing) if missing else "none"))
    return 0 if good == len(results) else 2


if __name__ == "__main__":
    raise SystemExit(main())
