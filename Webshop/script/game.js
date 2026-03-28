import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE (same as main.js)
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDBSXTDyFZJiL3AaYOH3zcOCuyuxknlBuQ",
  authDomain: "swenggyak2026.firebaseapp.com",
  projectId: "swenggyak2026",
  storageBucket: "swenggyak2026.firebasestorage.app",
  messagingSenderId: "61285892844",
  appId: "1:61285892844:web:ec6458eec13129544d1bc9",
  measurementId: "G-WX2KJTKN43"
};
// ─────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── GET GAME ID FROM URL ──────────────────────────────────────
// e.g. game.html?id=abc123
const params = new URLSearchParams(window.location.search);
const gameId = params.get("id");

// ── CART HELPERS ──────────────────────────────────────────────
function getCart() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(game) {
    const cart = getCart();
    const existing = cart.find(item => item.id === game.id);
    if (existing) {
        existing.qty = (existing.qty || 1) + 1;
    } else {
        cart.push({ id: game.id, title: game.title, price: game.price, currency: game.currency, qty: 1 });
    }
    saveCart(cart);
    updateCartCount();
    showToast();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const el = document.getElementById("cartCount");
    if (el) el.textContent = total;
}

function showToast() {
    const toast = document.getElementById("cartToast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

// ── RENDER SPEC ROWS ─────────────────────────────────────────
function specRow(label, value) {
    if (!value) return "";
    return `
        <div class="spec-row">
            <span class="spec-label">${label}</span>
            <span class="spec-value">${value}</span>
        </div>`;
}

// ── RENDER PAGE ───────────────────────────────────────────────
function renderGame(game) {
    const page = document.getElementById("gamePage");

    const displayPrice = game.currency && game.price != null
        ? `${game.currency} ${Number(game.price).toFixed(2)}`
        : "N/A";

    const genres = Array.isArray(game.genre)
        ? game.genre.map(g => `<span class="genre-tag">${g}</span>`).join("")
        : "";

    const platforms = Array.isArray(game.platform)
        ? game.platform.map(p => `<span class="platform-tag">${p}</span>`).join("")
        : "";

    const min  = game.specs?.minimum  || {};
    const rec  = game.specs?.recommended || {};

    page.innerHTML = `
        <!-- HERO -->
        <div class="game-hero">
            <img class="game-cover" src="${game.image}" alt="${game.title}">

            <div class="purchase-panel">
                <h1 class="game-title-panel">${game.title}</h1>
                <div class="game-price-panel">${displayPrice}</div>

                <div class="genre-tags">${genres}</div>
                <div class="platform-tags">${platforms}</div>

                <button class="btn-add-cart" id="btnAddCart">
                    <i class="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
                <button class="btn-buy-now" id="btnBuyNow">
                    <i class="fa-solid fa-bolt"></i> Buy Now
                </button>
            </div>
        </div>

        <!-- DESCRIPTION -->
        <div class="game-info-section">
            <h3 class="section-heading">About this game</h3>
            <p class="game-description">${(game.description || "No description available.").replace(/\n/g, "<br>")}</p>
        </div>

        <!-- SPECS -->
        <div class="game-info-section">
            <h3 class="section-heading">System Requirements</h3>
            <div class="specs-grid">

                <div class="specs-box">
                    <h4>Minimum</h4>
                    ${specRow("OS",        min.os)}
                    ${specRow("Processor", min.cpu)}
                    ${specRow("Memory",    min.ram)}
                    ${specRow("Graphics",  min.gpu)}
                    ${specRow("Storage",   min.storage)}
                    ${specRow("DirectX",   min.directx)}
                </div>

                <div class="specs-box">
                    <h4>Recommended</h4>
                    ${specRow("OS",        rec.os)}
                    ${specRow("Processor", rec.cpu)}
                    ${specRow("Memory",    rec.ram)}
                    ${specRow("Graphics",  rec.gpu)}
                    ${specRow("Storage",   rec.storage)}
                    ${specRow("DirectX",   rec.directx)}
                </div>

            </div>
        </div>
    `;

    // Update page title
    document.title = `${game.title} – Halo`;

    // Button listeners
    document.getElementById("btnAddCart").addEventListener("click", () => {
        addToCart(game);
    });

    document.getElementById("btnBuyNow").addEventListener("click", () => {
        addToCart(game);
        window.location.href = "page_under_development.html";
    });
}

// ── FETCH GAME FROM FIRESTORE ─────────────────────────────────
async function fetchGame() {
    if (!gameId) {
        document.getElementById("loadingMsg").textContent = "No game specified.";
        return;
    }

    try {
        const snap = await getDoc(doc(db, "games", gameId));

        if (!snap.exists()) {
            document.getElementById("loadingMsg").textContent = "Game not found.";
            return;
        }

        const game = { id: snap.id, ...snap.data() };
        renderGame(game);
    } catch (err) {
        document.getElementById("loadingMsg").textContent = "Failed to load game.";
        console.error(err);
    }
}

// ── REGION PREFERENCES ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();

    const languageSelect = document.getElementById("language");
    const currencySelect = document.getElementById("currency");
    const saveBtn        = document.getElementById("savePreferences");
    const regionDisplay  = document.getElementById("regionDisplay");

    function formatLanguage(lang) { return lang === "en" ? "English" : "Magyar"; }
    function formatCurrency(curr) { return curr === "eur" ? "EUR" : "HUF"; }

    function updateHeader() {
        const lang = localStorage.getItem("language") || "hu";
        const curr = localStorage.getItem("currency") || "huf";
        regionDisplay.textContent = formatLanguage(lang) + " | " + formatCurrency(curr) + " ▼";
    }

    const savedLang = localStorage.getItem("language");
    const savedCurr = localStorage.getItem("currency");
    if (savedLang && languageSelect) languageSelect.value = savedLang;
    if (savedCurr && currencySelect) currencySelect.value = savedCurr;
    updateHeader();

    if (saveBtn) {
        saveBtn.addEventListener("click", e => {
            e.preventDefault();
            localStorage.setItem("language", languageSelect.value);
            localStorage.setItem("currency", currencySelect.value);
            updateHeader();
        });
    }
});

// ── INIT ──────────────────────────────────────────────────────
fetchGame();
