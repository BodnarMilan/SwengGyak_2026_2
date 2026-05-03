import { db } from "./firebase-config.js";
  import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  // ── GUARD ─────────────────────────────────────────────────────
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  const userId   = sessionStorage.getItem("userId");
  const username = sessionStorage.getItem("username");

  if (!loggedIn || !userId) {
    window.location.href = "main_page-login.html";
  }

  // ── LOGOUT ────────────────────────────────────────────────────
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    localStorage.removeItem("cart");
    window.location.href = "main_page-login.html";
  });

  // ── LOAD USER DATA ────────────────────────────────────────────
  async function loadDashboard() {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return;
      const user = snap.data();

      // Avatar initials
      const initial = (user.username || "?")[0].toUpperCase();
      document.getElementById("avatarInitial").textContent  = initial;
      document.getElementById("profileInitial").textContent = initial;

      // Profile
      document.getElementById("profileName").textContent  = user.username || "–";
      document.getElementById("profileEmail").textContent = user.email    || "–";

      // Profile completion
      let filled = 0;
      if (user.username) filled++;
      if (user.email)    filled++;
      const pct = Math.round((filled / 2) * 100);
      document.getElementById("progressValue").textContent   = pct + "%";
      document.getElementById("progressFill").style.width    = pct + "%";
      document.getElementById("completedMsg").textContent    =
        pct === 100 ? "✔ Profile complete" : "Fill in all fields to complete your profile.";

      // Account info
      document.getElementById("infoLanguage").textContent = user.language === "en" ? "English" : "Magyar";
      document.getElementById("infoCurrency").textContent = (user.currency || "huf").toUpperCase();

      if (user.createdAt) {
        const d = new Date(user.createdAt);
        document.getElementById("infoMemberSince").textContent =
          d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
      }

      // Purchases
      const purchases = user.purchasedGames || [];
      document.getElementById("infoTotalPurchases").textContent =
        purchases.length + (purchases.length === 1 ? " game" : " games");

      renderRecentPurchases(purchases);

    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }

  // ── RENDER RECENT PURCHASES ───────────────────────────────────
  async function renderRecentPurchases(purchases) {
    const container = document.getElementById("recentPurchases");

    if (!purchases || purchases.length === 0) {
      container.innerHTML = `<p class="muted-text">No purchases yet.</p>`;
      return;
    }

    // Show last 5, most recent first
    const recent = [...purchases].reverse().slice(0, 5);

    // Fetch game images from Firestore (batch by unique gameIds)
    const uniqueIds = [...new Set(recent.map(p => p.gameId))];
    const imageMap  = {};

    await Promise.all(uniqueIds.map(async id => {
      try {
        const gSnap = await getDoc(doc(db, "games", id));
        if (gSnap.exists()) imageMap[id] = gSnap.data().image || "";
      } catch {}
    }));

    container.innerHTML = recent.map(p => {
      const img = imageMap[p.gameId] || "";
      const date = new Date(p.purchasedAt).toLocaleDateString("en-GB", {
        year: "numeric", month: "short", day: "numeric"
      });
      const price = p.currency === "EUR"
        ? `EUR ${Number(p.pricePaid).toFixed(2)}`
        : `${Number(p.pricePaid).toFixed(0)} HUF`;

      return `
        <div class="game-card">
          ${img ? `<img src="${img}" alt="${p.title}" style="width:100%;height:100px;object-fit:cover;display:block;">` : ""}
          <h3 style="font-size:0.8rem;padding:7px 8px 2px;margin:0;">${p.title}</h3>
          <p style="font-size:0.75rem;color:#7b2ff7;font-weight:700;padding:0 8px 4px;margin:0;">${price}</p>
          <p style="font-size:0.72rem;color:#888;padding:0 8px 8px;margin:0;">${date}</p>
        </div>
      `;
    }).join("");
  }

  loadDashboard();

  // ── LOGIN HISTORY ───────────────────────────────────────────
  // reads loginHistory from the user doc and
  // renders a table of the last 30 days of logins.
  async function renderLoginHistory(history) {
    const container = document.getElementById("loginHistoryList");
    if (!history || history.length === 0) {
      container.innerHTML = `<p class="muted-text">No login history recorded yet.</p>`;
      return;
    }

    const rows = [...history].reverse().map(entry => {
      const date = new Date(entry.timestamp).toLocaleString("en-GB", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      // Simple browser label from userAgent
      let browser = "Unknown browser";
      const ua = entry.userAgent || "";
      if (ua.includes("Chrome") && !ua.includes("Edg"))  browser = "Chrome";
      else if (ua.includes("Firefox"))                    browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Edg"))                        browser = "Edge";

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 14px;border-bottom:1px solid #1c1c25;font-size:0.88rem;">
          <span style="color:#cfcfe6;">${date}</span>
          <span style="color:#888;">${browser}</span>
          <span style="color:#4caf7d;font-size:0.8rem;">✔ Successful</span>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div style="border:1px solid #222;border-radius:10px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;padding:8px 14px;
                    background:#1c1c25;font-size:0.78rem;color:#666;font-weight:700;
                    text-transform:uppercase;letter-spacing:0.5px;">
          <span>Date & Time</span><span>Browser</span><span>Status</span>
        </div>
        ${rows}
      </div>
    `;
  }

  // ── WISHLIST ────────────────────────────────────────────────
  // reads wishlist game IDs from the user doc,
  // fetches each game from the games collection, and renders cards.
  async function renderWishlist(wishlistIds) {
    const container = document.getElementById("wishlistItems");
    if (!wishlistIds || wishlistIds.length === 0) {
      container.innerHTML = `<p class="muted-text">Your wishlist is empty.</p>`;
      return;
    }

    const cards = await Promise.all(wishlistIds.map(async id => {
      try {
        const gSnap = await getDoc(doc(db, "games", id));
        if (!gSnap.exists()) return "";
        const g = gSnap.data();
        const price = g.priceEUR != null
          ? `EUR ${Number(g.priceEUR).toFixed(2)}`
          : (g.price != null ? `${g.price} ${g.currency || ""}` : "N/A");
        return `
          <a href="game.html?id=${id}" style="text-decoration:none;" class="game-card">
            <img src="${g.image || ""}" alt="${g.title}"
                 style="width:100%;height:100px;object-fit:cover;display:block;">
            <h3 style="font-size:0.8rem;padding:7px 8px 2px;margin:0;color:#fff;">${g.title}</h3>
            <p style="font-size:0.75rem;color:#7b2ff7;font-weight:700;padding:0 8px 8px;margin:0;">${price}</p>
          </a>
        `;
      } catch { return ""; }
    }));

    container.innerHTML = cards.join("");
  }

  // Hook renderLoginHistory and renderWishlist into loadDashboard
  const _snap = await (async () => {
    const s = await getDoc(doc(db, "users", userId));
    return s;
  })();

  if (_snap.exists()) {
    const _data = _snap.data();
    await renderLoginHistory(_data.loginHistory || []);
    await renderWishlist(_data.wishlist || []);
  }