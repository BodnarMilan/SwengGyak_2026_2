import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── SESSION ───────────────────────────────────────────────────
const loggedIn = sessionStorage.getItem("loggedIn") === "true";
const userId   = sessionStorage.getItem("userId");
const username = sessionStorage.getItem("username");
const currency = (sessionStorage.getItem("currency") || localStorage.getItem("currency") || "huf").toLowerCase();

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

// ── CURRENCY ──────────────────────────────────────────────────
function getPrice(game) {
    if (currency === "eur") {
        return game.priceEUR != null
            ? `EUR ${Number(game.priceEUR).toFixed(2)}`
            : (game.price != null ? `EUR ${Number(game.price).toFixed(2)}` : "N/A");
    } else {
        return game.priceHUF != null
            ? `${Number(game.priceHUF).toFixed(0)} HUF`
            : (game.price != null ? `${Number(game.price).toFixed(2)} ${game.currency || ""}` : "N/A");
    }
}

function getPriceValue(game) {
    if (currency === "eur") return game.priceEUR ?? game.price ?? 0;
    return game.priceHUF ?? game.price ?? 0;
}

function getCurrencyLabel() {
    return currency === "eur" ? "EUR" : "HUF";
}

// ── STATE ─────────────────────────────────────────────────────
let allGames       = [];
let activePlatform = "all";
let activeGenre    = "all";
let searchQuery    = "";

// ── FETCH GAMES ───────────────────────────────────────────────
async function fetchGames() {
    try {
        const snapshot = await getDocs(collection(db, "games"));
        allGames = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        shuffle(allGames);
        renderGames();
    } catch (err) {
        document.getElementById("gameGrid").innerHTML =
            `<p class="loading-msg" style="color:#f55;">Failed to load games. Check your Firebase config.</p>`;
        console.error(err);
    }
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// ── RENDER GAMES ──────────────────────────────────────────────
function renderGames() {
    const grid = document.getElementById("gameGrid");
    grid.innerHTML = "";

    const filtered = allGames.filter(game => {
        const platformOk = activePlatform === "all" ||
            (Array.isArray(game.platform) && game.platform.includes(activePlatform));
        const genreOk = activeGenre === "all" ||
            (Array.isArray(game.genre) && game.genre.includes(activeGenre));
        const searchOk = searchQuery === "" ||
            game.title.toLowerCase().includes(searchQuery.toLowerCase());
        return platformOk && genreOk && searchOk;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="loading-msg">No games found for this filter.</p>`;
        return;
    }

    filtered.forEach(game => {
        const displayPrice    = getPrice(game);
        const displayPlatform = Array.isArray(game.platform) ? game.platform.join(", ") : (game.platform || "");

        const card = document.createElement("a");
        card.className = "game-card";
        card.href = `game.html?id=${game.id}`;
        card.innerHTML = `
            <img src="${game.image}" alt="${game.title}" loading="lazy">
            <div class="game-info">
                <h3>${game.title}</h3>
                <p class="platform">${displayPlatform}</p>
                <p class="price">${displayPrice}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ── CART (Firestore if logged in, otherwise locked) ───────────
async function loadCart() {
    if (!loggedIn || !userId) {
        renderCartPanel([]);
        return;
    }
    try {
        const snap = await getDoc(doc(db, "users", userId));
        const cart = snap.exists() ? (snap.data().cart || []) : [];
        renderCartPanel(cart);
        updateCartCount(cart);
    } catch (err) {
        console.error("Cart load error:", err);
    }
}

async function saveCartToFirestore(cart) {
    if (!loggedIn || !userId) return;
    try {
        await updateDoc(doc(db, "users", userId), { cart });
    } catch (err) {
        console.error("Cart save error:", err);
    }
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

    // Total
    const total = cart.reduce((sum, item) => {
        const p = currency === "eur"
            ? (item.priceEUR ?? item.price ?? 0)
            : (item.priceHUF ?? item.price ?? 0);
        return sum + p * (item.qty || 1);
    }, 0);

    const totalStr = currency === "eur"
        ? `Total: EUR ${total.toFixed(2)}`
        : `Total: ${total.toFixed(0)} HUF`;
    totalEl.textContent = totalStr;

    // Remove buttons
    itemsEl.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id   = btn.dataset.id;
            const snap = await getDoc(doc(db, "users", userId));
            let cart   = snap.exists() ? (snap.data().cart || []) : [];
            cart = cart.filter(i => i.id !== id);
            await saveCartToFirestore(cart);
            renderCartPanel(cart);
            updateCartCount(cart);
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

// ── PLATFORM FILTER ───────────────────────────────────────────
document.querySelectorAll(".platform-item").forEach(item => {
    item.addEventListener("click", e => {
        e.preventDefault();
        document.querySelectorAll(".platform-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        activePlatform = item.dataset.platform;
        renderGames();
    });
});

// ── GENRE FILTER ──────────────────────────────────────────────
document.querySelectorAll(".genre-sidebar li").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".genre-sidebar li").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        activeGenre = item.dataset.genre;
        renderGames();
    });
});

// ── SEARCH ────────────────────────────────────────────────────
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", e => {
        searchQuery = e.target.value;
        renderGames();
    });
}

// ── REGION PREFERENCES ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
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
    if (savedLang) languageSelect.value = savedLang;
    if (savedCurr) currencySelect.value = savedCurr;
    updateHeader();

    saveBtn.addEventListener("click", async e => {
        e.preventDefault();
        const newLang = languageSelect.value;
        const newCurr = currencySelect.value;

        localStorage.setItem("language", newLang);
        localStorage.setItem("currency", newCurr);
        updateHeader();

        // Also persist to Firestore user doc if logged in
        if (loggedIn && userId) {
            try {
                await updateDoc(doc(db, "users", userId), {
                    language: newLang,
                    currency: newCurr
                });
                sessionStorage.setItem("language", newLang);
                sessionStorage.setItem("currency", newCurr);
            } catch (err) {
                console.error("Pref save error:", err);
            }
        }

        // Reload so prices re-render in new currency
        window.location.reload();
    });
});

// ── INIT ──────────────────────────────────────────────────────
fetchGames();
loadCart();

// ── CHECKOUT BUTTON GUARD ─────────────────────────────────────
async function goToCheckout() {
    if (!loggedIn || !userId) {
        window.location.href = "Main_page-login.html";
        return;
    }
    const snap = await getDoc(doc(db, "users", userId));
    const cart = snap.exists() ? (snap.data().cart || []) : [];
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
