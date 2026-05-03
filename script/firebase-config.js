// ── SHARED FIREBASE CONFIG ────────────────────────────────────
// Imported by: main.js, game.js, login.js, register.js
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBSXTDyFZJiL3AaYOH3zcOCuyuxknlBuQ",
    authDomain: "swenggyak2026.firebaseapp.com",
    projectId: "swenggyak2026",
    storageBucket: "swenggyak2026.firebasestorage.app",
    messagingSenderId: "61285892844",
    appId: "1:61285892844:web:ec6458eec13129544d1bc9"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export { db };
