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

// ── PASSWORD POLICY ───────────────────────────────────────────
function validatePassword(password) {
    const commonPasswords = [
        "123456", "12345678", "password", "qwerty",
        "admin123", "letmein", "111111"
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
        return "This password is too common.";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    if (!/[A-Z]/.test(password)) {
        return "Password must contain an uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
        return "Password must contain a lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
        return "Password must contain a number.";
    }

    if (!/[!@#$%^&*]/.test(password)) {
        return "Password must contain a special character (!@#).";
    }

    return null;
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

// ── PASSWORD MATCH CHECK ─────────────────────────────────────
confirmInput.addEventListener("input", () => {
    if (confirmInput.value && passwordInput.value !== confirmInput.value) {
        setError(confirmInput, passwordError, "Passwords do not match.");
    } else {
        clearError(confirmInput, passwordError);
    }
});

// ── PASSWORD TOGGLE ──────────────────────────────────────────
window.toggleVis = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const type  = input.type === "password" ? "text" : "password";
    input.type  = type;
    btn.textContent = type === "password" ? "Show" : "Hide";
};

// ── FORM SUBMIT ───────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormMessages();

    const email    = emailInput.value.trim().toLowerCase();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm  = confirmInput.value;

    let hasError = false;

    clearError(emailInput, emailError);
    clearError(usernameInput, usernameError);
    clearError(passwordInput, passwordError);
    clearError(confirmInput, passwordError);

    if (!email) {
        setError(emailInput, emailError, "Email is required.");
        alert("Email is required.");
        hasError = true;
    }

    if (!username) {
        setError(usernameInput, usernameError, "Username is required.");
        alert("Username is required.");
        hasError = true;
    }

    const passwordValidationError = validatePassword(password);

    if (passwordValidationError) {
        setError(passwordInput, passwordError, passwordValidationError);
        alert(passwordValidationError);
        hasError = true;
    }

    if (password !== confirm) {
        setError(confirmInput, passwordError, "Passwords do not match.");
        alert("Passwords do not match.");
        hasError = true;
    }

    if (hasError) return;

    const submitBtn = form.querySelector(".login-btn");
    submitBtn.disabled = true;
    submitBtn.value = "Checking...";

    try {
        const emailQuery = query(collection(db, "users"), where("email", "==", email));
        const emailSnap  = await getDocs(emailQuery);
        if (!emailSnap.empty) {
            setError(emailInput, emailError, "This email is already registered.");
            alert("This email is already registered.");
            submitBtn.disabled = false;
            submitBtn.value = "Register";
            return;
        }

        const userQuery = query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()));
        const userSnap  = await getDocs(userQuery);
        if (!userSnap.empty) {
            setError(usernameInput, usernameError, "This username is already taken.");
            alert("This username is already taken.");
            submitBtn.disabled = false;
            submitBtn.value = "Register";
            return;
        }

        const docId = username.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

        await setDoc(doc(db, "users", docId), {
            username: username,
            usernameLower: username.toLowerCase(),
            email: email,
            password: password,
            createdAt: new Date().toISOString()
        });

        showFormSuccess("Account created successfully!");
        submitBtn.value = "Done!";

        setTimeout(() => {
            window.location.href = "main_page-login.html";
        }, 2000);

    } catch (err) {
        showFormError(`Something went wrong: ${err.message}`);
        alert("Error: " + err.message);
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.value = "Register";
    }
});