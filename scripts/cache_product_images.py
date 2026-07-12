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
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(sys.argv[1]).resolve()
OUT = ROOT / "public" / "products"
OUT.mkdir(parents=True, exist_ok=True)

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
)


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
    try:
        direct, final_url, warning = page_metadata_images(product["url"])
        candidates.extend((url, "page metadata") for url in direct)
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
            output = save_thumbnail(product, image_url, final_url)
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
