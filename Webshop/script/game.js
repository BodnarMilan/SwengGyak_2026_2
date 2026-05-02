import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── SESSION ───────────────────────────────────────────────────
const loggedIn = sessionStorage.getItem("loggedIn") === "true";
const userId   = sessionStorage.getItem("userId");
const username = sessionStorage.getItem("username");
const currency = (sessionStorage.getItem("currency") || localStorage.getItem("currency") || "huf").toLowerCase();

// ── URL PARAM ─────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const gameId = params.get("id");

// ── AUTH AREA ─────────────────────────────────────────────────
const authArea = document.getElementById("authArea");
if (loggedIn && username) {
    authArea.innerHTML = `
        <span class="user-greeting">Hi, <a href="Dashboard.html" class="username-link"><strong>${username}</strong></a></span>
        <button class="logout-btn" id="logoutBtn">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.clear();
        localStorage.removeItem("cart");
        window.location.href = "Main_page-login.html";
    });
}

// ── CURRENCY HELPERS ──────────────────────────────────────────
function getPrice(game) {
    if (currency === "eur") {
        const p = game.priceEUR ?? game.price;
        return p != null ? `EUR ${Number(p).toFixed(2)}` : "N/A";
    } else {
        const p = game.priceHUF ?? game.price;
        return p != null ? `${Number(p).toFixed(0)} HUF` : "N/A";
    }
}

// ── CART HELPERS ──────────────────────────────────────────────
async function getCart() {
    if (!loggedIn || !userId) return [];
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().cart || []) : [];
}

async function saveCart(cart) {
    if (!loggedIn || !userId) return;
    await updateDoc(doc(db, "users", userId), { cart });
}

async function addToCart(game) {
    let cart = await getCart();
    const existing = cart.find(item => item.id === game.id);
    if (existing) {
        existing.qty = (existing.qty || 1) + 1;
    } else {
        cart.push({
            id:       game.id,
            title:    game.title,
            price:    game.price    ?? null,
            priceEUR: game.priceEUR ?? game.price ?? null,
            priceHUF: game.priceHUF ?? null,
            currency: game.currency ?? "EUR",
            qty:      1
        });
    }
    await saveCart(cart);
    await refreshCart();
    showToast();
}

// ── CART PANEL ────────────────────────────────────────────────
async function refreshCart() {
    const cart = await getCart();
    updateCartCount(cart);
    renderCartPanel(cart);
}

function updateCartCount(cart) {
    const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const el = document.getElementById("cartCount");
    if (el) el.textContent = total > 0 ? total : "0";
}

function renderCartPanel(cart) {
    const itemsEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");

    if (!cart || cart.length === 0) {
        itemsEl.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
        totalEl.textContent = "";
        return;
    }

    itemsEl.innerHTML = cart.map(item => {
        const priceDisplay = currency === "eur"
            ? `EUR ${Number(item.priceEUR ?? item.price ?? 0).toFixed(2)}`
            : `${Number(item.priceHUF ?? item.price ?? 0).toFixed(0)} HUF`;
        return `
            <div class="cart-item">
                <span class="cart-item-title">${item.title}</span>
                <span class="cart-item-qty">x${item.qty || 1}</span>
                <span class="cart-item-price">${priceDisplay}</span>
                <button class="cart-item-remove" data-id="${item.id}">✕</button>
            </div>
        `;
    }).join("");

    const total = cart.reduce((sum, item) => {
        const p = currency === "eur"
            ? (item.priceEUR ?? item.price ?? 0)
            : (item.priceHUF ?? item.price ?? 0);
        return sum + p * (item.qty || 1);
    }, 0);

    totalEl.textContent = currency === "eur"
        ? `Total: EUR ${total.toFixed(2)}`
        : `Total: ${total.toFixed(0)} HUF`;

    // Remove buttons
    itemsEl.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", async () => {
            let cart = await getCart();
            cart = cart.filter(i => i.id !== btn.dataset.id);
            await saveCart(cart);
            updateCartCount(cart);
            renderCartPanel(cart);
        });
    });
}

// ── CART DROPDOWN TOGGLE ──────────────────────────────────────
const cartDropdown = document.getElementById("cartDropdown");
const cartBtn      = document.getElementById("cartBtn");
const cartPanel    = document.getElementById("cartPanel");

cartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cartPanel.classList.toggle("open");
});

document.addEventListener("click", (e) => {
    if (!cartDropdown.contains(e.target)) {
        cartPanel.classList.remove("open");
    }
});

// ── TOAST ─────────────────────────────────────────────────────
function showToast() {
    const toast = document.getElementById("cartToast");
    if (!toast) return;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

// ── RENDER SPEC ROW ───────────────────────────────────────────
function specRow(label, value) {
    if (!value) return "";
    return `
        <div class="spec-row">
            <span class="spec-label">${label}</span>
            <span class="spec-value">${value}</span>
        </div>`;
}

// ── RENDER GAME PAGE ──────────────────────────────────────────
function renderGame(game) {
    const page = document.getElementById("gamePage");

    const displayPrice = getPrice(game);

    const genres = Array.isArray(game.genre)
        ? game.genre.map(g => `<span class="genre-tag">${g}</span>`).join("") : "";

    const platforms = Array.isArray(game.platform)
        ? game.platform.map(p => `<span class="platform-tag">${p}</span>`).join("") : "";

    const min = game.specs?.minimum     || {};
    const rec = game.specs?.recommended || {};

    const description = (game.description || "No description available.")
        .replace(/\n/g, "<br>");

    page.innerHTML = `
        <div class="game-hero">
            <img class="game-cover" src="${game.image}" alt="${game.title}">

            <div class="purchase-panel">
                <h1 class="game-title-panel">${game.title}</h1>
                <div class="game-price-panel">${displayPrice}</div>

                <div class="genre-tags">${genres}</div>
                <div class="platform-tags">${platforms}</div>

                ${loggedIn ? `
                    <button class="btn-add-cart" id="btnAddCart">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn-buy-now" id="btnBuyNow">
                        <i class="fa-solid fa-bolt"></i> Buy Now
                    </button>
                ` : `
                    <p class="login-to-buy">
                        <a href="Main_page-login.html">Login</a> to purchase this game.
                    </p>
                `}
            </div>
        </div>

        <div class="game-info-section">
            <h3 class="section-heading">About this game</h3>
            <p class="game-description">${description}</p>
        </div>

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

    document.title = `${game.title} – Halo`;

    if (loggedIn) {
        document.getElementById("btnAddCart").addEventListener("click", () => addToCart(game));
        document.getElementById("btnBuyNow").addEventListener("click", async () => {
            await addToCart(game);
            window.location.href = "checkout.html";
        });
    }
}

// ── FETCH GAME ────────────────────────────────────────────────
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
        renderGame({ id: snap.id, ...snap.data() });
    } catch (err) {
        document.getElementById("loadingMsg").textContent = "Failed to load game.";
        console.error(err);
    }
}

// ── REGION PREFERENCES ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    // Load cart count + panel on page open
    await refreshCart();

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
// fetchGame() is now called via fetchGameWithWishlist() at the bottom

// ── CHECKOUT BUTTON GUARD ─────────────────────────────────────
async function goToCheckout() {
    const cart = await getCart();
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    window.location.href = "checkout.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) checkoutBtn.addEventListener("click", goToCheckout);
});

// ── WISHLIST ──────────────────────────────────────────────────
// Appended block — adds a wishlist toggle button to the purchase
// panel on the game detail page. Reads & writes to Firestore.

async function getWishlist() {
    if (!loggedIn || !userId) return [];
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().wishlist || []) : [];
}

async function initWishlistButton(gameId) {
    if (!loggedIn) return;

    const wishlist    = await getWishlist();
    const isWishlisted = wishlist.includes(gameId);

    // Inject button into purchase panel after it was rendered
    const panel = document.querySelector(".purchase-panel");
    if (!panel) return;

    const btn = document.createElement("button");
    btn.className = `btn-wishlist ${isWishlisted ? "wishlisted" : ""}`;
    btn.id = "btnWishlist";
    btn.innerHTML = isWishlisted
        ? `<i class="fa-solid fa-heart"></i> Remove from Wishlist`
        : `<i class="fa-regular fa-heart"></i> Add to Wishlist`;

    // Insert before the first button (Add to Cart) or at the top of panel actions
    const firstBtn = panel.querySelector(".btn-add-cart") || panel.querySelector(".login-to-buy");
    if (firstBtn) {
        panel.insertBefore(btn, firstBtn);
    } else {
        panel.appendChild(btn);
    }

    btn.addEventListener("click", async () => {
        const current   = await getWishlist();
        const inList    = current.includes(gameId);
        const updated   = inList
            ? current.filter(id => id !== gameId)
            : [...current, gameId];

        await updateDoc(doc(db, "users", userId), { wishlist: updated });

        const nowIn = updated.includes(gameId);
        btn.className = `btn-wishlist ${nowIn ? "wishlisted" : ""}`;
        btn.innerHTML = nowIn
            ? `<i class="fa-solid fa-heart"></i> Remove from Wishlist`
            : `<i class="fa-regular fa-heart"></i> Add to Wishlist`;
    });
}

// Hook into fetchGame — after renderGame runs, init the wishlist button
const _originalFetchGame = fetchGame;
async function fetchGameWithWishlist() {
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
        await initWishlistButton(game.id);
    } catch (err) {
        document.getElementById("loadingMsg").textContent = "Failed to load game.";
        console.error(err);
    }
}

// Replace the init call at the bottom
fetchGameWithWishlist();
