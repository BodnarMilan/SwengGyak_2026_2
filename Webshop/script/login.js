document.addEventListener("DOMContentLoaded", () => {

    const languageSelect = document.getElementById("language");
    const currencySelect = document.getElementById("currency");
    const saveBtn = document.getElementById("savePreferences");
    const regionDisplay = document.getElementById("regionDisplay");

    // ===== FORMAT =====
    function formatLanguage(lang) {
        return lang === "en" ? "English" : "Magyar";
    }

    function formatCurrency(curr) {
        return curr === "eur" ? "EUR" : "HUF";
    }

    function updateHeader() {
        const lang = localStorage.getItem("language") || "hu";
        const curr = localStorage.getItem("currency") || "huf";

        regionDisplay.textContent =
            formatLanguage(lang) + " | " + formatCurrency(curr) + " ▼";
    }

    // ===== LOAD SAVED =====
    const savedLang = localStorage.getItem("language");
    const savedCurrency = localStorage.getItem("currency");

    if (savedLang) languageSelect.value = savedLang;
    if (savedCurrency) currencySelect.value = savedCurrency;

    updateHeader();

    // ===== SAVE =====
    saveBtn.addEventListener("click", (e) => {
        e.preventDefault();

        localStorage.setItem("language", languageSelect.value);
        localStorage.setItem("currency", currencySelect.value);

        updateHeader();
    });

    // ===== PASSWORD TOGGLE =====
    const passwordInput = document.getElementById("password");
    const toggleButton = document.getElementById("togglePassword");

    toggleButton.addEventListener("click", () => {
        const type = passwordInput.type === "password" ? "text" : "password";
        passwordInput.type = type;
        toggleButton.textContent = type === "password" ? "Show" : "Hide";
    });

});