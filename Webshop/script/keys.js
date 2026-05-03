import { db } from "./firebase-config.js";
  import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

  // ── STATE ─────────────────────────────────────────────────────
  let allKeys    = []; // enriched purchase records that have a key
  let imageCache = {};

  // ── FETCH GAME IMAGE ──────────────────────────────────────────
  async function fetchImage(gameId) {
    if (imageCache[gameId] !== undefined) return imageCache[gameId];
    try {
      const snap = await getDoc(doc(db, "games", gameId));
      imageCache[gameId] = snap.exists() ? (snap.data().image || "") : "";
    } catch { imageCache[gameId] = ""; }
    return imageCache[gameId];
  }

  // ── RENDER ────────────────────────────────────────────────────
  function renderKeys(keys) {
    const list = document.getElementById("keyList");

    if (!keys || keys.length === 0) {
      list.innerHTML = `
        <div class="keys-empty">
          <i class="fa-solid fa-key"></i>
          <p>No keys found.</p>
          <a href="Main_page.html">Browse the Store</a>
        </div>`;
      return;
    }

    list.innerHTML = keys.map((entry, idx) => {
      const date = new Date(entry.purchasedAt).toLocaleDateString("en-GB", {
        year: "numeric", month: "short", day: "numeric"
      });
      const img    = imageCache[entry.gameId] || "";
      const keyVal = entry.key || null;

      return `
        <div class="key-row" data-idx="${idx}">

          ${img
            ? `<img class="key-thumb" src="${img}" alt="${entry.title}">`
            : `<div class="key-thumb-placeholder"><i class="fa-solid fa-gamepad"></i></div>`}

          <div class="key-info">
            <p class="key-info-title">${entry.title}</p>
            <p class="key-info-date"><i class="fa-regular fa-calendar"></i> ${date}</p>

            ${keyVal ? `
              <div class="key-field">
                <span class="key-value" data-key="${keyVal}" data-idx="${idx}">${keyVal}</span>
                <button class="key-toggle-btn" data-idx="${idx}">
                  <i class="fa-regular fa-eye"></i> Reveal
                </button>
                <button class="key-copy-btn" data-key="${keyVal}" data-idx="${idx}"
                        title="Copy key">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
              <p class="key-hint">Hover to partially reveal · click Reveal to show fully</p>
            ` : `
              <span class="no-key-badge">No key — purchased before key system</span>
            `}
          </div>

          <div class="key-actions-col">
            <a href="game.html?id=${entry.gameId}" class="btn-view-game">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View
            </a>
          </div>

        </div>
      `;
    }).join("");

    // ── TOGGLE LISTENERS ────────────────────────────────────────
    list.querySelectorAll(".key-toggle-btn[data-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx      = btn.dataset.idx;
        const keySpan  = list.querySelector(`.key-value[data-idx="${idx}"]`);
        if (!keySpan) return;

        const revealed = keySpan.classList.toggle("revealed");
        btn.innerHTML  = revealed
          ? `<i class="fa-regular fa-eye-slash"></i> Hide`
          : `<i class="fa-regular fa-eye"></i> Reveal`;
        btn.classList.toggle("active", revealed);
      });
    });

    // ── COPY LISTENERS ──────────────────────────────────────────
    list.querySelectorAll(".key-copy-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key = btn.dataset.key;
        try {
          await navigator.clipboard.writeText(key);
          btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
          btn.classList.add("copied");
          setTimeout(() => {
            btn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
            btn.classList.remove("copied");
          }, 2000);
        } catch {
          btn.title = "Copy failed — try manually";
        }
      });
    });
  }

  // ── SEARCH ────────────────────────────────────────────────────
  function applySearch() {
    const q = document.getElementById("keysSearchInline").value.toLowerCase();
    const filtered = q
      ? allKeys.filter(k => k.title.toLowerCase().includes(q))
      : allKeys;
    renderKeys(filtered);
  }

  document.getElementById("keysSearchInline").addEventListener("input", applySearch);

  // ── REVEAL ALL / HIDE ALL ─────────────────────────────────────
  document.getElementById("revealAllBtn").addEventListener("click", () => {
    document.querySelectorAll(".key-value").forEach(span => span.classList.add("revealed"));
    document.querySelectorAll(".key-toggle-btn[data-idx]").forEach(btn => {
      btn.innerHTML = `<i class="fa-regular fa-eye-slash"></i> Hide`;
      btn.classList.add("active");
    });
  });

  document.getElementById("hideAllBtn").addEventListener("click", () => {
    document.querySelectorAll(".key-value").forEach(span => span.classList.remove("revealed"));
    document.querySelectorAll(".key-toggle-btn[data-idx]").forEach(btn => {
      btn.innerHTML = `<i class="fa-regular fa-eye"></i> Reveal`;
      btn.classList.remove("active");
    });
  });

  // ── LOAD DATA ─────────────────────────────────────────────────
  async function loadKeys() {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return;

    const user      = snap.data();
    const purchases = user.purchasedGames || [];

    document.getElementById("avatarInitial").textContent = (user.username || "?")[0].toUpperCase();

    if (purchases.length === 0) {
      document.getElementById("statTotal").textContent  = "0";
      document.getElementById("statUnique").textContent = "0";
      renderKeys([]);
      return;
    }

    // Fetch all images in parallel
    const uniqueIds = [...new Set(purchases.map(p => p.gameId))];
    await Promise.all(uniqueIds.map(fetchImage));

    // Most recent first
    allKeys = [...purchases].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

    // Stats
    document.getElementById("statTotal").textContent  = allKeys.length;
    document.getElementById("statUnique").textContent = uniqueIds.length;

    renderKeys(allKeys);
  }

  loadKeys();