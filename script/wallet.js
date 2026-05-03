  import { db } from "./firebase-config.js";
  import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  // ── GUARD ─────────────────────────────────────────────────────
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  const userId   = sessionStorage.getItem("userId");
  if (!loggedIn || !userId) window.location.href = "main_page-login.html";

  // ── LOGOUT ────────────────────────────────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    localStorage.removeItem("cart");
    window.location.href = "main_page-login.html";
  });

  // ── AVATAR ────────────────────────────────────────────────────
  (async () => {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        document.getElementById("avatarInitial").textContent =
          (snap.data().username || "?")[0].toUpperCase();
      }
    } catch {}
  })();