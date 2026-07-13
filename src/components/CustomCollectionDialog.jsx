import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { icons } from "./icons.jsx";
import {
  MAX_PHOTO_BYTES,
  fetchProductMetadata,
  formatFileSize,
  inferCategory,
  isImageFile,
  nameFromFile,
  safeHttps,
} from "../lib/customCollections.js";

const EMPTY = { url: "", category: "", name: "", price: "", note: "" };
const NEW_TAB = "__new_tab__";
const PRESET_TABS = ["Necklaces", "Watches", "Lenses", "Scrubs"];

export default function CustomCollectionDialog({ open, onClose, onSubmit, names, initialCategory, onNavigate }) {
  const [values, setValues] = useState(EMPTY);
  const [categorySelect, setCategorySelect] = useState("");
  const dropdownNames = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const name of [...PRESET_TABS, ...names]) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(name);
    }
    return merged;
  }, [names]);
  const autoRef = useRef({ category: true, name: true, price: true, note: true });
  const [analysis, setAnalysis] = useState({ message: "링크를 기다리는 중", state: "idle" });
  const [photoStatus, setPhotoStatus] = useState({ message: "사진을 드래그하거나 붙여넣을 수도 있어요.", state: "idle" });
  const [photo, setPhoto] = useState(null); // { file, url, meta }
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fileRef = useRef(null);
  const debounce = useRef(0);
  const controller = useRef(null);
  const lastAnalysis = useRef(null);
  const photoUrl = useRef("");

  // Reset each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setValues({ ...EMPTY, category: initialCategory || "" });
    setCategorySelect(initialCategory || (dropdownNames.length === 0 ? NEW_TAB : ""));
    autoRef.current = { category: !initialCategory, name: true, price: true, note: true };
    setAnalysis({ message: "링크를 기다리는 중", state: "idle" });
    setPhotoStatus({ message: "사진을 드래그하거나 붙여넣을 수도 있어요.", state: "idle" });
    clearPhoto();
    setError("");
    lastAnalysis.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory]);

  useEffect(
    () => () => {
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
      controller.current?.abort();
      clearTimeout(debounce.current);
    },
    [],
  );

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field !== "url") autoRef.current[field] = false;
  };

  const applyAutofill = (patch) => {
    setValues((v) => {
      const next = { ...v };
      for (const [field, value] of Object.entries(patch)) {
        if (field === "category") continue;
        if (value && (v[field] === "" || autoRef.current[field])) {
          next[field] = value;
          autoRef.current[field] = true;
        }
      }
      return next;
    });
    if (patch.category && autoRef.current.category) {
      const match = dropdownNames.find(
        (name) => name.localeCompare(patch.category, undefined, { sensitivity: "accent" }) === 0,
      );
      setCategorySelect(match || NEW_TAB);
      setValues((v) => ({ ...v, category: match || patch.category }));
    }
  };

  const onCategorySelect = (value) => {
    setCategorySelect(value);
    autoRef.current.category = false;
    setValues((v) => ({ ...v, category: value === NEW_TAB ? "" : value }));
  };

  const analyze = async (raw) => {
    const url = safeHttps(String(raw || "").trim());
    if (!raw) {
      lastAnalysis.current = null;
      setAnalysis({ message: "링크를 기다리는 중", state: "idle" });
      return;
    }
    if (!url) {
      setAnalysis({ message: "https:// 로 시작하는 제품 링크를 붙여넣어 주세요.", state: "error" });
      return;
    }
    if (lastAnalysis.current?.url === url) return;
    controller.current?.abort();
    controller.current = new AbortController();
    setAnalysis({ message: "제품 페이지를 읽고 정보를 정리하는 중…", state: "loading" });
    setBusy(true);
    try {
      const metadata = await fetchProductMetadata(url, controller.current.signal);
      lastAnalysis.current = metadata;
      applyAutofill({ category: metadata.category, name: metadata.name, price: metadata.price, note: metadata.note });
      setAnalysis({
        message:
          metadata.source === "metadata"
            ? "정보 정리 완료 · 확인 후 바로 추가할 수 있어요."
            : "링크에서 기본 정보를 정리했어요. 필요한 부분만 확인해 주세요.",
        state: "success",
      });
    } catch (err) {
      if (err.name !== "AbortError") setAnalysis({ message: "링크 분석을 완료하지 못했어요. 직접 입력해 주세요.", state: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onUrlChange = (value) => {
    setField("url", value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => analyze(value), 650);
  };

  function clearPhoto() {
    if (photoUrl.current) {
      URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = "";
    }
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const selectPhoto = (file) => {
    if (!file) return setPhotoStatus({ message: "이미지 파일을 찾지 못했어요.", state: "error" });
    if (!isImageFile(file)) return setPhotoStatus({ message: "이미지 형식의 파일을 선택해 주세요.", state: "error" });
    if (file.size > MAX_PHOTO_BYTES) return setPhotoStatus({ message: "사진은 30 MB 이하로 선택해 주세요.", state: "error" });
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    const url = URL.createObjectURL(file);
    photoUrl.current = url;
    const label = `${String(file.type || file.name.split(".").pop() || "image").replace(/^image\//, "").toUpperCase()} · ${formatFileSize(file.size)}`;
    setPhoto({ file, url, label });
    const inferredName = nameFromFile(file.name);
    applyAutofill({
      name: inferredName,
      category: inferCategory(inferredName, file.name),
      note: `업로드한 제품 사진 · ${formatFileSize(file.size)}`,
    });
    setPhotoStatus({ message: "사진 준비 완료 · 카드에 이 사진이 표시됩니다.", state: "success" });
  };

  const submit = async (e) => {
    e.preventDefault();
    const suppliedUrl = values.url.trim();
    if (suppliedUrl && !safeHttps(suppliedUrl)) {
      setError("제품 링크는 https:// 로 시작해야 합니다.");
      return;
    }
    const categoryName = values.category.trim();
    const productName = values.name.trim();
    if (!categoryName || !productName) {
      setError("카테고리와 제품명을 모두 입력해 주세요.");
      return;
    }
    setError("");
    setBusy(true);
    if (suppliedUrl && lastAnalysis.current?.url !== safeHttps(suppliedUrl)) await analyze(suppliedUrl);
    const url =
      safeHttps(suppliedUrl) || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${productName} ${categoryName}`)}`;
    const image = !photo && lastAnalysis.current?.url === url ? lastAnalysis.current.image || "" : "";
    try {
      const categoryId = await onSubmit({
        categoryName,
        productName,
        price: values.price,
        note: values.note,
        url,
        image,
        photoFile: photo?.file || null,
      });
      onClose();
      onNavigate(categoryId);
    } catch {
      setError("제품을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="cc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add a product"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cc-head">
              <div>
                <h2>Pharmer's pick 추가하기</h2>
                <p>제품 링크 또는 사진으로 시작하세요. 둘 다 넣어도 좋아요.</p>
              </div>
              <button className="icon-btn" type="button" onClick={onClose} aria-label="닫기">
                {icons.close}
              </button>
            </div>

            <form className="cc-form" onSubmit={submit}>
              <div className="cc-intake">
                <div className="cc-intake-title">
                  <strong>링크 또는 제품 사진</strong>
                  <span>둘 중 하나만 있어도 추가할 수 있어요.</span>
                </div>
                <div className="cc-field full">
                  <label htmlFor="cc-url">Paste a product link</label>
                  <input
                    id="cc-url"
                    inputMode="url"
                    placeholder="https://…"
                    value={values.url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onPaste={(e) => setTimeout(() => analyze(e.target.value), 0)}
                  />
                  <p className="cc-status" data-state={analysis.state}>
                    {analysis.message}
                  </p>
                </div>

                <div className="cc-or">
                  <span>OR</span>
                </div>

                <div
                  className="cc-drop"
                  data-drag={dragging}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    selectPhoto([...e.dataTransfer.files].find(isImageFile));
                  }}
                  onPaste={(e) => {
                    const file = [...(e.clipboardData?.files || [])].find(isImageFile);
                    if (file) selectPhoto(file);
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => selectPhoto(e.target.files?.[0])}
                  />
                  {photo ? (
                    <div className="cc-preview">
                      <img src={photo.url} alt="선택한 제품 사진" />
                      <span>
                        <strong>{photo.file.name || "Pasted product photo"}</strong>
                        <small>{photo.label}</small>
                      </span>
                      <button className="icon-btn cc-remove" type="button" onClick={clearPhoto} aria-label="사진 제거">
                        {icons.close}
                      </button>
                    </div>
                  ) : (
                    <button className="cc-drop-empty" type="button" onClick={() => fileRef.current?.click()}>
                      {icons.photo}
                      <strong>사진을 놓거나 눌러서 선택</strong>
                      <small>JPG · PNG · WEBP 등 · 최대 30 MB</small>
                    </button>
                  )}
                </div>
                <p className="cc-status" data-state={photoStatus.state}>
                  {photoStatus.message}
                </p>
              </div>

              <div className="cc-field">
                <label htmlFor="cc-category">Category</label>
                <select
                  id="cc-category"
                  required
                  value={categorySelect}
                  onChange={(e) => onCategorySelect(e.target.value)}
                >
                  <option value="" disabled>
                    탭을 선택하세요
                  </option>
                  {dropdownNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option value={NEW_TAB}>+ 새 탭 만들기</option>
                </select>
                {categorySelect === NEW_TAB && (
                  <input
                    id="cc-category-new"
                    placeholder="새 탭 이름 · 예: Sneakers"
                    required
                    autoFocus
                    value={values.category}
                    onChange={(e) => setField("category", e.target.value)}
                  />
                )}
                <small>같은 이름의 제품은 한 탭에 모입니다.</small>
              </div>
              <div className="cc-field">
                <label htmlFor="cc-name">Product name</label>
                <input
                  id="cc-name"
                  placeholder="예: New Balance 530"
                  required
                  value={values.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
                <small>알아보고 싶은 제품명을 입력하세요.</small>
              </div>
              <div className="cc-field">
                <label htmlFor="cc-price">Price · optional</label>
                <input
                  id="cc-price"
                  placeholder="예: $120 또는 ₩89,000"
                  value={values.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </div>
              <div className="cc-field">
                <label htmlFor="cc-note">Note · optional</label>
                <input
                  id="cc-note"
                  placeholder="예: White / size 7"
                  value={values.note}
                  onChange={(e) => setField("note", e.target.value)}
                />
              </div>

              {error && <p className="cc-error">{error}</p>}

              <div className="cc-actions">
                <button className="btn ghost" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className="btn primary" type="submit" disabled={busy}>
                  제품 추가하고 탭 열기 <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
