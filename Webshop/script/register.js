import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDBSXTDyFZJiL3AaYOH3zcOCuyuxknlBuQ",
    authDomain: "swenggyak2026.firebaseapp.com",
    projectId: "swenggyak2026",
    storageBucket: "swenggyak2026.firebasestorage.app",
    messagingSenderId: "61285892844",
    appId: "1:61285892844:web:ec6458eec13129544d1bc9"
};
// ─────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── ELEMENT REFS ──────────────────────────────────────────────
const emailInput     = document.getElementById("regEmail");
const usernameInput  = document.getElementById("regUsername");
const passwordInput  = document.getElementById("regPassword");
const confirmInput   = document.getElementById("regPasswordConfirm");
const emailError     = document.getElementById("emailError");
const usernameError  = document.getElementById("usernameError");
const passwordError  = document.getElementById("passwordError");
const registerError  = document.getElementById("registerError");
const registerSuccess= document.getElementById("registerSuccess");
const form           = document.getElementById("registerForm");

// ── HELPERS ───────────────────────────────────────────────────
function setError(input, errorEl, msg) {
    input.classList.add("input-error");
    errorEl.textContent = msg;
}

function clearError(input, errorEl) {
    input.classList.remove("input-error");
    errorEl.textContent = "";
}

function showFormError(msg) {
    registerError.textContent = msg;
    registerError.classList.add("visible");
    registerSuccess.classList.remove("visible");
}

function showFormSuccess(msg) {
    registerSuccess.textContent = msg;
    registerSuccess.classList.add("visible");
    registerError.classList.remove("visible");
}

function hideFormMessages() {
    registerError.classList.remove("visible");
    registerSuccess.classList.remove("visible");
}

// ── LIVE DUPLICATE CHECK: EMAIL ───────────────────────────────
emailInput.addEventListener("blur", async () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;

    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
        setError(emailInput, emailError, "This email is already registered.");
    } else {
        clearError(emailInput, emailError);
    }
});

// ── LIVE DUPLICATE CHECK: USERNAME ───────────────────────────
usernameInput.addEventListener("blur", async () => {
    const username = usernameInput.value.trim().toLowerCase();
    if (!username) return;

    const q = query(collection(db, "users"), where("usernameLower", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) {
        setError(usernameInput, usernameError, "This username is already taken.");
    } else {
        clearError(usernameInput, usernameError);
    }
});

// ── LIVE PASSWORD MATCH CHECK ─────────────────────────────────
confirmInput.addEventListener("input", () => {
    if (confirmInput.value && passwordInput.value !== confirmInput.value) {
        setError(confirmInput, passwordError, "Passwords do not match.");
    } else {
        clearError(confirmInput, passwordError);
    }
});

// ── PASSWORD TOGGLE (standalone function for inline onclick) ──
window.toggleVis = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const type  = input.type === "password" ? "text" : "password";
    input.type  = type;
    btn.textContent = type === "password" ? "Show" : "Hide";
};

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

// ── FORM SUBMIT ───────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormMessages();

    const email    = emailInput.value.trim().toLowerCase();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm  = confirmInput.value;

    // ── CLIENT-SIDE VALIDATION ────────────────────────────────
    let hasError = false;

    if (!email) {
        setError(emailInput, emailError, "Email is required.");
        hasError = true;
    }

    if (!username) {
        setError(usernameInput, usernameError, "Username is required.");
        hasError = true;
    }

    if (password.length < 6) {
        setError(passwordInput, passwordError, "Password must be at least 6 characters.");
        hasError = true;
    }

    if (password !== confirm) {
        setError(confirmInput, passwordError, "Passwords do not match.");
        hasError = true;
    }

    if (hasError) return;

    // ── FIRESTORE DUPLICATE CHECK ─────────────────────────────
    const submitBtn = form.querySelector(".login-btn");
    submitBtn.disabled = true;
    submitBtn.value = "Checking...";

    try {
        // Check email
        const emailQuery = query(collection(db, "users"), where("email", "==", email));
        const emailSnap  = await getDocs(emailQuery);
        if (!emailSnap.empty) {
            setError(emailInput, emailError, "This email is already registered.");
            submitBtn.disabled = false;
            submitBtn.value = "Register";
            return;
        }

        // Check username (case-insensitive via lowercase field)
        const userQuery = query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()));
        const userSnap  = await getDocs(userQuery);
        if (!userSnap.empty) {
            setError(usernameInput, usernameError, "This username is already taken.");
            submitBtn.disabled = false;
            submitBtn.value = "Register";
            return;
        }

        // ── SAVE USER TO FIRESTORE ────────────────────────────
        // Document ID = lowercase username (readable & unique)
        const docId = username.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

        await setDoc(doc(db, "users", docId), {
            username:      username,
            usernameLower: username.toLowerCase(),
            email:         email,
            password:      password,   // ⚠ plain text for now — replace with hashing later
            createdAt:     new Date().toISOString(),

            // Future fields — already structured and ready to use
            language:      localStorage.getItem("language") || "hu",
            currency:      localStorage.getItem("currency") || "huf",
            purchasedGames: [],
            cart:          [],
            wishlist:      []
        });

        showFormSuccess("Account created successfully! Redirecting to login...");
        submitBtn.value = "Done!";

        setTimeout(() => {
            window.location.href = "Main_page-login.html";
        }, 2000);

    } catch (err) {
        showFormError(`Something went wrong: ${err.message}`);
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.value = "Register";
    }
});
