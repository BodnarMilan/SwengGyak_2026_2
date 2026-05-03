  import { db } from "./firebase-config.js";
  import {
    doc,
    getDoc,
    updateDoc
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  // ── GUARD ─────────────────────────────────────────────────────
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  const userId   = sessionStorage.getItem("userId");
  if (!loggedIn || !userId) window.location.href = "Main_page-login.html";

  // ── LOGOUT ────────────────────────────────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    localStorage.removeItem("cart");
    window.location.href = "Main_page-login.html";
  });

  // ── SHOW STATUS ───────────────────────────────────────────────
  function showStatus(msg, type) {
    const el = document.getElementById("saveStatus");
    el.textContent  = msg;
    el.className    = `save-status ${type}`;
    setTimeout(() => { el.className = "save-status"; }, 3500);
  }

  // ── LOAD USER DATA ────────────────────────────────────────────
  async function loadSettings() {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return;

    const user = snap.data();

    // Avatar
    document.getElementById("avatarInitial").textContent = (user.username || "?")[0].toUpperCase();

    // Account info (read-only display)
    document.getElementById("infoUsername").textContent = user.username || "–";
    document.getElementById("infoEmail").textContent    = user.email    || "–";

    if (user.createdAt) {
      document.getElementById("infoSince").textContent = new Date(user.createdAt)
        .toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
    }

    // Pre-select current language and currency from Firestore
    const lang = user.language || "hu";
    const curr = user.currency || "huf";

    document.getElementById("settingLanguage").value = lang;
    document.getElementById("settingCurrency").value = curr;
  }

  // ── SAVE SETTINGS ─────────────────────────────────────────────
  document.getElementById("btnSave").addEventListener("click", async () => {
    const btn  = document.getElementById("btnSave");
    const lang = document.getElementById("settingLanguage").value;
    const curr = document.getElementById("settingCurrency").value;

    btn.disabled  = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      // Write to Firestore
      await updateDoc(doc(db, "users", userId), {
        language: lang,
        currency: curr
      });

      // Sync session and localStorage so changes take effect immediately
      sessionStorage.setItem("language", lang);
      sessionStorage.setItem("currency", curr);
      localStorage.setItem("language",   lang);
      localStorage.setItem("currency",   curr);

      showStatus("✔ Preferences saved successfully.", "success");

    } catch (err) {
      showStatus(`✘ Error: ${err.message}`, "error");
      console.error(err);
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Preferences`;
    }
  });

  // ── INIT ──────────────────────────────────────────────────────
  loadSettings();