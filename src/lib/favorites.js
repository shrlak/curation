// Saved/favorited product ids, synced across devices via Firestore (mirrors
// the tabs/products sync in customCollections.js).
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

const FAVORITES_COLLECTION = "favorites";
const LEGACY_STORAGE_KEY = "abigail-favorites";
const MIGRATION_FLAG = "curation-for-abigail-favorites-migrated-v1";

export function subscribeFavorites(onChange) {
  return onSnapshot(collection(db, FAVORITES_COLLECTION), (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, createdAt: d.data().createdAt?.toMillis?.() || 0 }));
    docs.sort((a, b) => a.createdAt - b.createdAt);
    onChange(docs.map((d) => d.id));
  });
}

export const addFavoriteDoc = (id) => setDoc(doc(db, FAVORITES_COLLECTION, id), { createdAt: serverTimestamp() });

export const removeFavoriteDoc = (id) => deleteDoc(doc(db, FAVORITES_COLLECTION, id));

// One-time upgrade: earlier versions kept the saved list in this browser's
// localStorage only. Pull any pre-existing local favorites into Firestore
// once so they aren't stranded on whichever device favorited them first.
export async function migrateLocalFavorites() {
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id) await addFavoriteDoc(id);
      }
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* leave the migration flag unset so it can be retried next load */
  }
}
