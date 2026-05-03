import { db } from "./firebase-config.js";
  import {
    doc,
    getDoc,
    updateDoc
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  // ── GUARD ─────────────────────────────────────────────────────
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  const userId   = sessionStorage.getItem("userId");
  const currency = (sessionStorage.getItem("currency") || localStorage.getItem("currency") || "huf").toLowerCase();
  if (!loggedIn || !userId) window.location.href = "main_page-login.html";

  // ── LOGOUT ────────────────────────────────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    localStorage.removeItem("cart");
    window.location.href = "main_page-login.html";
  });

  // ── STATE ─────────────────────────────────────────────────────
  let allWishlistGames = []; // { id, title, priceEUR, priceHUF, platform, image }

  // ── PRICE HELPER ──────────────────────────────────────────────
  function formatPrice(game) {
    if (currency === "eur") {
      const p = game.priceEUR ?? game.price;
      return p != null ? `EUR ${Number(p).toFixed(2)}` : "N/A";
    } else {
      const p = game.priceHUF ?? game.price;
      return p != null ? `${Number(p).toFixed(0)} HUF` : "N/A";
    }
  }

  // ── RENDER ────────────────────────────────────────────────────
  function renderWishlist(games) {
    const container = document.getElementById("wishlistContainer");
    const countEl   = document.getElementById("wlCount");

    countEl.textContent = games.length > 0 ? `(${games.length})` : "";

    if (games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-heart"></i>
          <p>Your wishlist is empty.</p>
          <a href="main_page.html">Browse the Store</a>
        </div>
      `;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "wishlist-grid";

    games.forEach(game => {
      const card = document.createElement("div");
      card.className = "wl-card";
      card.dataset.id    = game.id;
      card.dataset.title = game.title.toLowerCase();

      card.innerHTML = `
        <img src="${game.image || ""}" alt="${game.title}">
        <div class="wl-card-body">
          <p class="wl-card-title">${game.title}</p>
          <p class="wl-card-price">${formatPrice(game)}</p>
          <p class="wl-card-platform">${Array.isArray(game.platform) ? game.platform.join(", ") : (game.platform || "")}</p>
        </div>
        <div class="wl-card-actions">
          <a href="game.html?id=${game.id}" class="wl-btn-view">View Game</a>
          <button class="wl-btn-remove" data-id="${game.id}" title="Remove from Wishlist">
            <i class="fa-solid fa-heart-crack"></i>
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(grid);

    // Remove buttons
    container.querySelectorAll(".wl-btn-remove").forEach(btn => {
      btn.addEventListener("click", async () => {
        const gameId = btn.dataset.id;
        await removeFromWishlist(gameId);
      });
    });
  }

  // ── REMOVE ────────────────────────────────────────────────────
  async function removeFromWishlist(gameId) {
    allWishlistGames = allWishlistGames.filter(g => g.id !== gameId);
    const updatedIds = allWishlistGames.map(g => g.id);

    try {
      await updateDoc(doc(db, "users", userId), { wishlist: updatedIds });
    } catch (err) {
      console.error("Wishlist remove error:", err);
    }

    // Re-render with current search filter applied
    const query = document.getElementById("wlSearch").value.toLowerCase();
    const filtered = query
      ? allWishlistGames.filter(g => g.title.toLowerCase().includes(query))
      : allWishlistGames;

    renderWishlist(filtered);
  }

  // ── SEARCH ────────────────────────────────────────────────────
  document.getElementById("wlSearch").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    const filtered = q
      ? allWishlistGames.filter(g => g.title.toLowerCase().includes(q))
      : allWishlistGames;
    renderWishlist(filtered);
  });

  // ── LOAD DATA ─────────────────────────────────────────────────
  async function loadWishlist() {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return;

    const user = snap.data();
    document.getElementById("avatarInitial").textContent = (user.username || "?")[0].toUpperCase();

    const wishlistIds = user.wishlist || [];

    if (wishlistIds.length === 0) {
      allWishlistGames = [];
      renderWishlist([]);
      return;
    }

    // Fetch each game's data from Firestore
    const games = await Promise.all(wishlistIds.map(async id => {
      try {
        const gSnap = await getDoc(doc(db, "games", id));
        if (!gSnap.exists()) return null;
        return { id, ...gSnap.data() };
      } catch { return null; }
    }));

    allWishlistGames = games.filter(Boolean);
    renderWishlist(allWishlistGames);
  }

  loadWishlist();