import { db } from "./firebase-config.js";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

    // ── PASSWORD TOGGLE ───────────────────────────────────────
    const passwordInput = document.getElementById("password");
    const toggleButton  = document.getElementById("togglePassword");
    if (toggleButton && passwordInput) {
        toggleButton.addEventListener("click", () => {
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            toggleButton.textContent = type === "password" ? "Show" : "Hide";
        });
    }

    // ── LOGIN FORM ────────────────────────────────────────────
    const loginForm  = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.classList.remove("visible");

        const username = document.getElementById("loginUsername").value.trim().toLowerCase();
        const password = document.getElementById("password").value;
        const submitBtn = loginForm.querySelector(".login-btn");

        submitBtn.disabled = true;
        submitBtn.value = "Logging in...";

        try {
            // Look up user by usernameLower field
            const q    = query(collection(db, "users"), where("usernameLower", "==", username));
            const snap = await getDocs(q);

            if (snap.empty) {
                loginError.textContent = "No account found with that username.";
                loginError.classList.add("visible");
                submitBtn.disabled = false;
                submitBtn.value = "Login";
                return;
            }

            const userDoc  = snap.docs[0];
            const userData = userDoc.data();

            if (userData.password !== password) {
                loginError.textContent = "Incorrect password.";
                loginError.classList.add("visible");
                submitBtn.disabled = false;
                submitBtn.value = "Login";
                return;
            }

            // ── SUCCESS: store session ────────────────────────
            // Clear any stale guest cart before loading user's cart
            localStorage.removeItem("cart");

            sessionStorage.setItem("loggedIn",   "true");
            sessionStorage.setItem("username",   userData.username);
            sessionStorage.setItem("userId",     userDoc.id);
            sessionStorage.setItem("currency",   userData.currency || "huf");
            sessionStorage.setItem("language",   userData.language || "hu");

            // Sync preferences to localStorage too (for header display)
            localStorage.setItem("currency", userData.currency || "huf");
            localStorage.setItem("language", userData.language || "hu");

            await recordLogin(userDoc.id);
            window.location.href = "main_page.html";

        } catch (err) {
            loginError.textContent = `Error: ${err.message}`;
            loginError.classList.add("visible");
            submitBtn.disabled = false;
            submitBtn.value = "Login";
            console.error(err);
        }
    });
});


// ── LOGIN HISTORY ─────────────────────────────────────────────
// Writes a timestamped entry to loginHistory on the user doc.
// Automatically trims entries older than 30 days.
async function recordLogin(userId) {
    const now    = new Date().toISOString();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const userRef = doc(db, "users", userId);
        const snap    = await getDoc(userRef);
        if (!snap.exists()) return;

        const history = snap.data().loginHistory || [];
        const trimmed = history.filter(e => e.timestamp >= cutoff);
        trimmed.push({
            timestamp: now,
            userAgent: navigator.userAgent
        });

        await updateDoc(userRef, { loginHistory: trimmed });
    } catch (err) {
        console.error("Login history write error:", err);
    }
}
