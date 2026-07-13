import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBuFD9rXtcqyHlWM94JQCHnXW64WaaVe_M",
  authDomain: "curation-ef7a9.firebaseapp.com",
  projectId: "curation-ef7a9",
  storageBucket: "curation-ef7a9.firebasestorage.app",
  messagingSenderId: "662067331987",
  appId: "1:662067331987:web:bca018b554e895f3d3de66",
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Some networks/proxies reset Firestore's default streaming transport;
  // force long-polling so it never attempts (and gets reset on) streaming.
  experimentalForceLongPolling: true,
});
