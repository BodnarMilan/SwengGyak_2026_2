// ── EDIT PROFILE ─────────────────────────────────────────────
  // handles opening/closing the Edit Profile
  // modal, live avatar preview, duplicate username check,
  // and Firestore write + session update on save.

  import { db } from "./firebase-config.js";
  import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const userId = sessionStorage.getItem("userId");

  // ── OPEN / CLOSE ─────────────────────────────────────────────
  function openModal() {
    // Pre-fill current values from displayed profile
    document.getElementById("epUsername").value = document.getElementById("profileName").textContent.trim();

    const currentImg = document.getElementById("profilePicImg");
    const urlInput   = document.getElementById("epPicUrl");
    if (currentImg.style.display !== "none") {
      urlInput.value = currentImg.src;
      previewEpImage(currentImg.src);
    } else {
      urlInput.value = "";
      resetEpAvatar();
    }

    clearEpMessages();
    document.getElementById("epOverlay").classList.add("open");
  }

  function closeModal() {
    document.getElementById("epOverlay").classList.remove("open");
  }

  document.getElementById("btnEditProfile").addEventListener("click", openModal);
  document.getElementById("epClose").addEventListener("click",  closeModal);
  document.getElementById("epCancel").addEventListener("click", closeModal);

  // Close on backdrop click
  document.getElementById("epOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("epOverlay")) closeModal();
  });

  // ── AVATAR PREVIEW ───────────────────────────────────────────
  window.previewEpImage = function(url) {
    const circle = document.getElementById("epAvatarCircle");
    const img    = document.getElementById("epAvatarImg");
    if (!url) { resetEpAvatar(); return; }
    img.src    = url;
    img.onload = () => {
      circle.style.display = "none";
      img.style.display    = "block";
    };
    img.onerror = () => { resetEpAvatar(); };
  };

  function resetEpAvatar() {
    const circle = document.getElementById("epAvatarCircle");
    const img    = document.getElementById("epAvatarImg");
    const name   = document.getElementById("epUsername").value.trim();
    circle.textContent   = name ? name[0].toUpperCase() : "?";
    circle.style.display = "flex";
    img.style.display    = "none";
  }

  // Update initial letter live as user types username
  document.getElementById("epUsername").addEventListener("input", e => {
    const circle = document.getElementById("epAvatarCircle");
    const img    = document.getElementById("epAvatarImg");
    if (img.style.display === "none") {
      circle.textContent = e.target.value ? e.target.value[0].toUpperCase() : "?";
    }
  });

  // ── MESSAGES ─────────────────────────────────────────────────
  function clearEpMessages() {
    document.getElementById("epError").textContent          = "";
    document.getElementById("epError").style.display        = "none";
    document.getElementById("epSuccess").textContent        = "";
    document.getElementById("epSuccess").style.display      = "none";
    document.getElementById("epUsernameError").textContent  = "";
    document.getElementById("epUsername").style.borderColor = "";
  }

  function showEpError(msg) {
    const el = document.getElementById("epError");
    el.textContent    = msg;
    el.style.display  = "block";
  }

  function showEpSuccess(msg) {
    const el = document.getElementById("epSuccess");
    el.textContent    = msg;
    el.style.display  = "block";
  }

  // ── SAVE ─────────────────────────────────────────────────────
  document.getElementById("epSave").addEventListener("click", async () => {
    clearEpMessages();

    const newUsername = document.getElementById("epUsername").value.trim();
    const newPicUrl   = document.getElementById("epPicUrl").value.trim();
    const btn         = document.getElementById("epSave");

    if (!newUsername) {
      document.getElementById("epUsernameError").textContent = "Username cannot be empty.";
      document.getElementById("epUsername").style.borderColor = "#e05555";
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      // Check if new username is taken by someone else
      const currentSnap = await getDoc(doc(db, "users", userId));
      const currentUser = currentSnap.data();
      const oldUsername = currentUser.username || "";

      if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
        const q    = query(collection(db, "users"), where("usernameLower", "==", newUsername.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          document.getElementById("epUsernameError").textContent = "This username is already taken.";
          document.getElementById("epUsername").style.borderColor = "#e05555";
          btn.disabled  = false;
          btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Changes`;
          return;
        }
      }

      // Build update object — only include picture if URL provided
      const updates = {
        username:      newUsername,
        usernameLower: newUsername.toLowerCase()
      };
      if (newPicUrl) updates.profilePicture = newPicUrl;
      if (!newPicUrl && currentUser.profilePicture) updates.profilePicture = "";

      await updateDoc(doc(db, "users", userId), updates);

      // Update session
      sessionStorage.setItem("username", newUsername);

      // Refresh profile card without page reload
      document.getElementById("profileName").textContent      = newUsername;
      document.getElementById("avatarInitial").textContent    = newUsername[0].toUpperCase();
      document.getElementById("profileInitial").textContent   = newUsername[0].toUpperCase();

      const profileImg = document.getElementById("profilePicImg");
      if (newPicUrl) {
        profileImg.src            = newPicUrl;
        profileImg.style.display  = "block";
        document.getElementById("profileInitial").style.display = "none";
      } else {
        profileImg.style.display  = "none";
        document.getElementById("profileInitial").style.display = "flex";
      }

      // Also update the "Hi, username" link in the auth area if present
      const greeting = document.querySelector(".username-link strong");
      if (greeting) greeting.textContent = newUsername;

      // Refresh completion bar (picture now counts toward completion)
      let filled = 0;
      if (newUsername)  filled++;
      if (currentUser.email) filled++;
      if (newPicUrl)    filled++;
      const total = 3;
      const pct   = Math.round((filled / total) * 100);
      document.getElementById("progressValue").textContent = pct + "%";
      document.getElementById("progressFill").style.width  = pct + "%";
      document.getElementById("completedMsg").textContent  =
        pct === 100 ? "✔ Profile complete" : "Fill in all fields to complete your profile.";

      showEpSuccess("✔ Profile updated successfully!");

      setTimeout(closeModal, 1800);

    } catch (err) {
      showEpError(`Something went wrong: ${err.message}`);
      console.error(err);
    } finally {
      btn.disabled  = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Changes`;
    }
  });

  // ── LOAD PROFILE PICTURE ON dashboard OPEN ───────────────────
  // If the user already has a profilePicture stored, show it
  // instead of the initial letter when the dashboard loads.
  (async () => {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return;
      const pic = snap.data().profilePicture || "";
      if (pic) {
        const profileImg = document.getElementById("profilePicImg");
        profileImg.src           = pic;
        profileImg.style.display = "block";
        document.getElementById("profileInitial").style.display = "none";
      }
    } catch {}
  })();

  // Top Up — inform user the feature is not supported
  document.getElementById("btnTopUp").addEventListener("click", () => {
    alert("Online balance top-up is not supported yet. Stay tuned for future updates!");
  });

  // Overview — redirect to wallet page
  document.getElementById("btnWalletOverview").addEventListener("click", () => {
    window.location.href = "wallet.html";
  });