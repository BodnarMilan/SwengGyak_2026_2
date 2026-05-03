import { db } from "./firebase-config.js";
  import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  let allOrders  = []; // enriched with game image
  let imageCache = {};

  // ── PRICE FORMAT ──────────────────────────────────────────────
  function formatPrice(order) {
    const cur = (order.currency || "EUR").toUpperCase();
    const p   = Number(order.pricePaid ?? 0);
    return cur === "HUF" ? `${p.toFixed(0)} HUF` : `EUR ${p.toFixed(2)}`;
  }

  function priceValue(order) {
    return Number(order.pricePaid ?? 0);
  }

  // ── FETCH GAME IMAGE ──────────────────────────────────────────
  async function fetchImage(gameId) {
    if (imageCache[gameId] !== undefined) return imageCache[gameId];
    try {
      const snap = await getDoc(doc(db, "games", gameId));
      imageCache[gameId] = snap.exists() ? (snap.data().image || "") : "";
    } catch {
      imageCache[gameId] = "";
    }
    return imageCache[gameId];
  }

  // ── RENDER ────────────────────────────────────────────────────
  function renderOrders(orders) {
    const list = document.getElementById("orderList");

    if (!orders || orders.length === 0) {
      list.innerHTML = `
        <div class="orders-empty">
          <i class="fa-solid fa-bag-shopping"></i>
          <p>No purchases found.</p>
          <a href="main_page.html">Browse the Store</a>
        </div>`;
      return;
    }

    list.innerHTML = orders.map(order => {
      const date = new Date(order.purchasedAt).toLocaleDateString("en-GB", {
        year: "numeric", month: "short", day: "numeric"
      });
      const img = imageCache[order.gameId] || "";

      return `
        <div class="order-row">
          ${img
            ? `<img class="order-thumb" src="${img}" alt="${order.title}">`
            : `<div class="order-thumb-placeholder"><i class="fa-solid fa-gamepad"></i></div>`
          }
          <div class="order-info">
            <p class="order-info-title">${order.title}</p>
            <p class="order-info-date"><i class="fa-regular fa-calendar"></i> ${date}</p>
          </div>
          <div class="order-price">${formatPrice(order)}</div>
          <div class="order-actions">
            <a href="game.html?id=${order.gameId}" class="btn-view-game">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View
            </a>
          </div>
        </div>
      `;
    }).join("");
  }

  // ── FILTER + SORT ─────────────────────────────────────────────
  function applyFilters() {
    const q    = document.getElementById("ordersSearch").value.toLowerCase();
    const sort = document.getElementById("ordersSort").value;

    let filtered = q
      ? allOrders.filter(o => o.title.toLowerCase().includes(q))
      : [...allOrders];

    switch (sort) {
      case "newest":     filtered.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)); break;
      case "oldest":     filtered.sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt)); break;
      case "price-high": filtered.sort((a, b) => priceValue(b) - priceValue(a)); break;
      case "price-low":  filtered.sort((a, b) => priceValue(a) - priceValue(b)); break;
      case "title":      filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
    }

    renderOrders(filtered);
  }

  document.getElementById("ordersSearch").addEventListener("input",  applyFilters);
  document.getElementById("ordersSort").addEventListener("change", applyFilters);

  // ── LOAD DATA ─────────────────────────────────────────────────
  async function loadOrders() {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return;

    const user     = snap.data();
    const purchases = user.purchasedGames || [];

    document.getElementById("avatarInitial").textContent = (user.username || "?")[0].toUpperCase();

    if (purchases.length === 0) {
      document.getElementById("statGames").textContent  = "0";
      document.getElementById("statSpent").textContent  = "–";
      document.getElementById("statFirst").textContent  = "–";
      document.getElementById("statLatest").textContent = "–";
      renderOrders([]);
      return;
    }

    // Fetch all game images in parallel
    await Promise.all([...new Set(purchases.map(p => p.gameId))].map(fetchImage));

    allOrders = [...purchases].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

    // ── STATS ─────────────────────────────────────────────────
    document.getElementById("statGames").textContent = purchases.length;

    // Group by currency for total spent
    const totals = {};
    purchases.forEach(p => {
      const cur = (p.currency || "EUR").toUpperCase();
      totals[cur] = (totals[cur] || 0) + Number(p.pricePaid ?? 0);
    });
    const spentStr = Object.entries(totals)
      .map(([cur, amt]) => cur === "HUF" ? `${amt.toFixed(0)} HUF` : `EUR ${amt.toFixed(2)}`)
      .join(" + ");
    document.getElementById("statSpent").textContent = spentStr;

    const sorted = [...purchases].sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt));
    const fmt = ts => new Date(ts).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });

    document.getElementById("statFirst").textContent  = fmt(sorted[0].purchasedAt);
    document.getElementById("statLatest").textContent = fmt(sorted[sorted.length - 1].purchasedAt);

    // ── INITIAL RENDER ────────────────────────────────────────
    applyFilters();
  }

  loadOrders();