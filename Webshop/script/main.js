// PLATFORM BUTTONS
const platformItems = document.querySelectorAll(".platform-item");

platformItems.forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();

        platformItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
    });
});


// GENRE BUTTONS
const genreItems = document.querySelectorAll(".genre-sidebar li");

genreItems.forEach(item => {
    item.addEventListener("click", () => {
        genreItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
    });
});

document.addEventListener("DOMContentLoaded", () => {

    const languageSelect = document.getElementById("language");
    const currencySelect = document.getElementById("currency");
    const saveBtn = document.getElementById("savePreferences");
    const regionDisplay = document.getElementById("regionDisplay");

    function formatLanguage(lang) {
        return lang === "en" ? "English" : "Magyar";
    }

    function formatCurrency(curr) {
        return curr === "eur" ? "EUR" : "HUF";
    }

    function updateHeader() {
        const savedLang = localStorage.getItem("language") || "hu";
        const savedCurrency = localStorage.getItem("currency") || "huf";

        regionDisplay.textContent =
            formatLanguage(savedLang) + " | " + formatCurrency(savedCurrency) + " ▼";
    }

    // betöltéskor
    updateHeader();

    // mentés
    saveBtn.addEventListener("click", (e) => {
        e.preventDefault();

        localStorage.setItem("language", languageSelect.value);
        localStorage.setItem("currency", currencySelect.value);

        updateHeader();
    });

});