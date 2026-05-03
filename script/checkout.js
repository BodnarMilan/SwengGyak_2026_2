import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── SESSION ───────────────────────────────────────────────────
const loggedIn = sessionStorage.getItem("loggedIn") === "true";
const userId   = sessionStorage.getItem("userId");
const username = sessionStorage.getItem("username");
const currency = (sessionStorage.getItem("currency") || localStorage.getItem("currency") || "huf").toLowerCase();

// ── GUARD: must be logged in ──────────────────────────────────
if (!loggedIn || !userId) {
    window.location.href = "main_page-login.html";
}

// ── AUTH AREA ─────────────────────────────────────────────────
const authArea = document.getElementById("authArea");
if (loggedIn && username) {
    authArea.innerHTML = `
        <span class="user-greeting">Hi, <a href="dashboard.html" class="username-link"><strong>${username}</strong></a></span>
        <button class="logout-btn" id="logoutBtn">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.clear();
        localStorage.removeItem("cart");
        window.location.href = "main_page-login.html";
    });
}

// ── CART HELPERS ──────────────────────────────────────────────
async function getCart() {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().cart || []) : [];
}

function formatPrice(item) {
    if (currency === "eur") {
        const p = item.priceEUR ?? item.price ?? 0;
        return `EUR ${Number(p).toFixed(2)}`;
    } else {
        const p = item.priceHUF ?? item.price ?? 0;
        return `${Number(p).toFixed(0)} HUF`;
    }
}

function getPriceValue(item) {
    if (currency === "eur") return Number(item.priceEUR ?? item.price ?? 0);
    return Number(item.priceHUF ?? item.price ?? 0);
}

// ── RENDER ORDER SUMMARY ──────────────────────────────────────
async function renderSummary() {
    const cart      = await getCart();
    const itemsEl   = document.getElementById("summaryItems");
    const totalEl   = document.getElementById("summaryTotal");

    // Empty cart → send back
    if (!cart || cart.length === 0) {
        window.location.href = "main_page.html";
        return;
    }

    itemsEl.innerHTML = cart.map(item => `
        <div class="summary-item">
            <div class="summary-item-left">
                <div class="summary-item-title">${item.title}</div>
                <div class="summary-item-qty">Qty: ${item.qty || 1}</div>
            </div>
            <div class="summary-item-price">${formatPrice(item)}</div>
        </div>
    `).join("");

    const total = cart.reduce((sum, item) => sum + getPriceValue(item) * (item.qty || 1), 0);
    totalEl.textContent = currency === "eur"
        ? `Total: EUR ${total.toFixed(2)}`
        : `Total: ${total.toFixed(0)} HUF`;
}

// ── CARD FORMATTING ───────────────────────────────────────────
window.formatCardNumber = function(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 16);
    input.value = v.replace(/(.{4})/g, "$1 ").trim();
};

window.formatExpiry = function(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    input.value = v;
};

// ── VALIDATION ────────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById("formError");
    el.textContent = msg;
    el.classList.add("visible");
}

function hideError() {
    const el = document.getElementById("formError");
    el.classList.remove("visible");
}

function markError(id) {
    document.getElementById(id).classList.add("input-error");
}

function clearErrors() {
    hideError();
    ["cardName","cardNumber","cardExpiry","cardCvv"].forEach(id => {
        document.getElementById(id).classList.remove("input-error");
    });
}

function validateForm() {
    clearErrors();
    let valid = true;

    const name   = document.getElementById("cardName").value.trim();
    const number = document.getElementById("cardNumber").value.replace(/\s/g, "");
    const expiry = document.getElementById("cardExpiry").value.trim();
    const cvv    = document.getElementById("cardCvv").value.trim();

    if (!name) {
        markError("cardName"); valid = false;
    }

    if (!/^\d{16}$/.test(number)) {
        markError("cardNumber"); valid = false;
    }

    // Expiry: MM/YY, month 01-12, year >= current year
    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) {
        markError("cardExpiry"); valid = false;
    } else {
        const month = parseInt(expiryMatch[1], 10);
        const year  = parseInt("20" + expiryMatch[2], 10);
        const now   = new Date();
        const expiryDate = new Date(year, month - 1, 1);
        const thisMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
        if (month < 1 || month > 12 || expiryDate < thisMonth) {
            markError("cardExpiry"); valid = false;
        }
    }

    if (!/^\d{3,4}$/.test(cvv)) {
        markError("cardCvv"); valid = false;
    }

    if (!valid) {
        showError("Please check the highlighted fields and try again.");
    }

    return valid;
}

// ── COMPLETE PURCHASE ─────────────────────────────────────────
async function completePurchase() {
    if (!validateForm()) return;

    const btn = document.getElementById("btnPay");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    try {
        const cart      = await getCart();
        const now       = new Date().toISOString();

        // Build purchase records — one entry per cart item
        const purchases = cart.flatMap(item => {
            const pricePaid = getPriceValue(item);
            const records   = [];
            for (let i = 0; i < (item.qty || 1); i++) {
                records.push({
                    gameId:      item.id,
                    title:       item.title,
                    pricePaid:   pricePaid,
                    currency:    currency.toUpperCase(),
                    purchasedAt: now
                });
            }
            return records;
        });

        // Write to Firestore:
        // - append each purchase to purchasedGames array
        // - clear the cart
        const userRef = doc(db, "users", userId);

        // arrayUnion appends to the array without overwriting existing entries
        await updateDoc(userRef, {
            purchasedGames: arrayUnion(...purchases),
            cart: []
        });

        // Show success overlay
        const names = [...new Set(cart.map(i => i.title))].join(", ");
        document.getElementById("successMsg").textContent =
            `You have successfully purchased: ${names}.`;
        document.getElementById("successOverlay").classList.add("show");

    } catch (err) {
        showError(`Something went wrong: ${err.message}`);
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-lock"></i> Complete Purchase`;
    }
}

// ── BUTTON LISTENER ───────────────────────────────────────────
document.getElementById("btnPay").addEventListener("click", completePurchase);

// ── INIT ──────────────────────────────────────────────────────
renderSummary();

// ── KEY GENERATION ────────────────────────────────────────────
// Appended block — generates a dummy key and attaches it to every
// purchase record at the moment of checkout completion.
// Format: Dummy_key_XXXXXX  (6 random digits)

function generateKey() {
    const digits = Math.floor(100000 + Math.random() * 900000);
    return `Dummy_key_${digits}`;
}

// ── COMPLETE PURCHASE (override with key support) ─────────────
// This appended version replaces completePurchase by redefining
// it and re-attaching the button listener at the bottom.
// The original listener is replaced via removeEventListener
// workaround — we clone the button to drop old listeners cleanly.

async function completePurchaseWithKeys() {
    if (!validateForm()) return;

    const btn = document.getElementById("btnPay");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    try {
        const cart = await getCart();
        const now  = new Date().toISOString();

        // Build purchase records — one per qty unit, each with its own key
        const purchases = cart.flatMap(item => {
            const pricePaid = getPriceValue(item);
            const records   = [];
            for (let i = 0; i < (item.qty || 1); i++) {
                records.push({
                    gameId:      item.id,
                    title:       item.title,
                    pricePaid:   pricePaid,
                    currency:    currency.toUpperCase(),
                    purchasedAt: now,
                    key:         generateKey()   // ← dummy key per copy
                });
            }
            return records;
        });

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            purchasedGames: arrayUnion(...purchases),
            cart: []
        });

        const names = [...new Set(cart.map(i => i.title))].join(", ");
        document.getElementById("successMsg").textContent =
            `You have successfully purchased: ${names}. Your keys are in the Keys Library.`;
        document.getElementById("successOverlay").classList.add("show");

    } catch (err) {
        showError(`Something went wrong: ${err.message}`);
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-lock"></i> Complete Purchase`;
    }
}

// Replace the old listener by cloning the button (drops all previous listeners)
(function replacePayListener() {
    const oldBtn = document.getElementById("btnPay");
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener("click", completePurchaseWithKeys);
})();
