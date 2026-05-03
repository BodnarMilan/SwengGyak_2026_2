 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
        import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDBSXTDyFZJiL3AaYOH3zcOCuyuxknlBuQ",
            authDomain: "swenggyak2026.firebaseapp.com",
            projectId: "swenggyak2026",
            appId: "1:61285892844:web:ec6458eec13129544d1bc9",
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        window.resetPassword = function () {
            const email = document.getElementById("email").value.trim();
            const message = document.getElementById("message");

            if (!email) {
                message.textContent = "Kérlek add meg az email címedet.";
                message.className = "message error";
                return;
            }

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    message.textContent = "if you have an account with that email, a reset link has been sent.";
                    message.className = "message success";
                })
                .catch((error) => {
                    console.error(error);
                    message.textContent = "An error occurred while sending the reset link. Please try again.";
                    message.className = "message error";
                });
        };