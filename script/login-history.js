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

  // ── BROWSER LABEL ─────────────────────────────────────────────
  function getBrowser(ua) {
    if (!ua) return "Unknown";
    if (ua.includes("Edg"))                              return "Edge";
    if (ua.includes("Chrome") && !ua.includes("Edg"))   return "Chrome";
    if (ua.includes("Firefox"))                          return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    return "Other";
  }

  // ── LOAD DATA ─────────────────────────────────────────────────
  async function loadHistory() {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return;

    const user    = snap.data();
    const history = user.loginHistory || [];
    const initial = (user.username || "?")[0].toUpperCase();

    document.getElementById("avatarInitial").textContent = initial;

    if (history.length === 0) {
      document.getElementById("statTotal").textContent   = "0";
      document.getElementById("statLast").textContent    = "No logins recorded";
      document.getElementById("statBrowser").textContent = "–";
      document.getElementById("historyTableWrap").innerHTML =
        `<p class="muted-text">No login history recorded yet. It will appear here after your next login.</p>`;
      return;
    }

    // Sort most recent first
    const sorted = [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Stats
    document.getElementById("statTotal").textContent = sorted.length;

    const lastDate = new Date(sorted[0].timestamp).toLocaleString("en-GB", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    document.getElementById("statLast").textContent = lastDate;

    // Most used browser
    const browserCounts = {};
    sorted.forEach(e => {
      const b = getBrowser(e.userAgent);
      browserCounts[b] = (browserCounts[b] || 0) + 1;
    });
    const topBrowser = Object.entries(browserCounts).sort((a, b) => b[1] - a[1])[0][0];
    document.getElementById("statBrowser").textContent = topBrowser;

    // Full table
    const rows = sorted.map((entry, i) => {
      const date = new Date(entry.timestamp).toLocaleString("en-GB", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
      const browser = getBrowser(entry.userAgent);
      const isLatest = i === 0;

      return `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;
                    align-items:center;gap:12px;padding:12px 16px;
                    border-bottom:1px solid #1c1c25;font-size:0.88rem;">
          <span style="color:#cfcfe6;">${date}</span>
          <span style="color:#888;">${browser}</span>
          <span style="color:#4caf7d;">✔ Successful</span>
          <span style="text-align:right;">
            ${isLatest ? `<span style="background:#7b2ff7;color:#fff;font-size:0.72rem;
                          font-weight:700;padding:2px 8px;border-radius:20px;">Current</span>` : ""}
          </span>
        </div>
      `;
    }).join("");

    document.getElementById("historyTableWrap").innerHTML = `
      <div style="border-radius:10px;overflow:hidden;border:1px solid #222;">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;
                    padding:10px 16px;background:#1c1c25;
                    font-size:0.75rem;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
          <span>Date &amp; Time</span>
          <span>Browser</span>
          <span>Status</span>
          <span></span>
        </div>
        ${rows}
      </div>
    `;
  }

  loadHistory();