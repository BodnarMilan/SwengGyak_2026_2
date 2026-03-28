import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE
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

// ── STATE ─────────────────────────────────────────────────────
let allGames       = [];
let activePlatform = "all";
let activeGenre    = "all";
let searchQuery    = "";

// ── FETCH ─────────────────────────────────────────────────────
async function fetchGames() {
    try {
        const snapshot = await getDocs(collection(db, "games"));
        allGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        shuffle(allGames);
        renderGames();
    } catch (err) {
        document.getElementById("gameGrid").innerHTML =
            `<p class="loading-msg" style="color:#f55;">Failed to load games. Check your Firebase config.</p>`;
        console.error("Firestore fetch error:", err);
    }
}

// ── SHUFFLE (Fisher-Yates) ─────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// ── RENDER ────────────────────────────────────────────────────
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
        const displayPrice = game.currency && game.price != null
            ? `${game.currency} ${Number(game.price).toFixed(2)}`
            : "N/A";

        const displayPlatform = Array.isArray(game.platform)
            ? game.platform.join(", ")
            : (game.platform || "");

        // Card is an <a> tag — clicking navigates to game.html?id=DOCID
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

    saveBtn.addEventListener("click", e => {
        e.preventDefault();
        localStorage.setItem("language", languageSelect.value);
        localStorage.setItem("currency", currencySelect.value);
        updateHeader();
    });
});

// ── INIT ──────────────────────────────────────────────────────
fetchGames();