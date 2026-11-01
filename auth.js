
(async function () {
    "use strict";

    // ==========================================
    // GIFHUB - AUTHENTIFICATION NETLIFY IDENTITY
    // ==========================================

    let identityUser = null;

    let netlifyIdentity;

    try {
        netlifyIdentity = await import(
            "https://esm.sh/@netlify/identity"
        );
    } catch (error) {
        console.error("Impossible de charger Netlify Identity :", error);
        alert("Erreur de connexion au service d'authentification.");
        return;
    }

    const {
        signup,
        login,
        logout,
        getUser,
        handleAuthCallback
    } = netlifyIdentity;

    // ==========================================
    // UTILITAIRES
    // ==========================================

    function getUsername(user) {
        return (
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Utilisateur"
        );
    }

    function getFavoriteKey() {
        return identityUser
            ? "gifhub_favs_" + identityUser.id
            : null;
    }

    function closeModal() {
        document
            .getElementById("auth-modal")
            ?.classList.add("hidden");
    }

    // ==========================================
    // GESTION DE LA SESSION
    // ==========================================

    function saveSession(user) {
        identityUser = user || null;

        if (user) {
            currentUser = {
                id: user.id,
                username: getUsername(user),
                email: user.email
            };

            localStorage.setItem(
                "gifhub_session_user",
                JSON.stringify(currentUser)
            );

            // Migration des anciens favoris
            const oldKey =
                "gifhub_favs_" + currentUser.username;

            const newKey = getFavoriteKey();

            if (
                localStorage.getItem(oldKey) &&
                !localStorage.getItem(newKey)
            ) {
                localStorage.setItem(
                    newKey,
                    localStorage.getItem(oldKey)
                );
            }

        } else {
            currentUser = null;

            localStorage.removeItem(
                "gifhub_session_user"
            );
        }

        if (typeof updateUserUI === "function") {
            updateUserUI();
        }

        if (typeof updateFavoriteBtnUI === "function") {
            updateFavoriteBtnUI();
        }

        if (typeof updateFavBadge === "function") {
            updateFavBadge();
        }
    }

    // ==========================================
    // OUVERTURE / FERMETURE DE LA CONNEXION
    // ==========================================

    window.openAuthModal = function (mode) {
        const modal = document.getElementById("auth-modal");

        if (!modal) return;

        modal.classList.remove("hidden");

        const title = document.getElementById(
            "auth-modal-title"
        );

        const submit = document.getElementById(
            "auth-submit-btn"
        );

        const button = document.getElementById(
            "auth-toggle-btn"
        );

        if (mode === "register") {
            title.textContent = "Créer un compte";
            submit.textContent = "S'inscrire";
            button.textContent =
                "Déjà un compte ? Se connecter";
        } else {
            title.textContent = "Connexion";
            submit.textContent = "Se connecter";
            button.textContent =
                "Pas encore de compte ? S'inscrire";
        }
    };

    window.closeAuthModal = function () {
        closeModal();
    };

    // ==========================================
    // CHANGEMENT CONNEXION / INSCRIPTION
    // ==========================================

    window.toggleAuthMode = function () {
        const title = document.getElementById(
            "auth-modal-title"
        );

        const submit = document.getElementById(
            "auth-submit-btn"
        );

        const button = document.getElementById(
            "auth-toggle-btn"
        );

        const isLogin =
            title.textContent.trim() === "Connexion";

        if (isLogin) {
            title.textContent = "Créer un compte";
            submit.textContent = "S'inscrire";
            button.textContent =
                "Déjà un compte ? Se connecter";
        } else {
            title.textContent = "Connexion";
            submit.textContent = "Se connecter";
            button.textContent =
                "Pas encore de compte ? S'inscrire";
        }
    };

    // ==========================================
    // INSCRIPTION ET CONNEXION
    // ==========================================

    window.handleAuthSubmit = async function (event) {
        event.preventDefault();

        const emailInput = document.getElementById(
            "auth-username"
        );

        const passwordInput = document.getElementById(
            "auth-password"
        );

        const submit = document.getElementById(
            "auth-submit-btn"
        );

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const isSignup =
            document
                .getElementById("auth-modal-title")
                .textContent
                .trim() === "Créer un compte";

        if (!email || !password) {
            alert("Remplis tous les champs.");
            return;
        }

        if (!email.includes("@")) {
            alert("Entre une adresse e-mail valide.");
            return;
        }

        if (password.length < 8) {
            alert("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        submit.disabled = true;

        const originalText = submit.textContent;
        submit.textContent = "Chargement...";

        try {
            if (isSignup) {
                await signup(email, password, {
                    full_name: email.split("@")[0]
                });

                alert(
                    "Inscription envoyée ! Vérifie tes e-mails pour confirmer ton compte, puis connecte-toi."
                );

                window.openAuthModal("login");

                passwordInput.value = "";

            } else {
                const user = await login(email, password);

                saveSession(user);

                closeModal();

                passwordInput.value = "";

                if (typeof renderHomeGrid === "function") {
                    renderHomeGrid();
                }

                if (typeof showToast === "function") {
                    showToast(
                        "Bienvenue, " + currentUser.username + " !"
                    );
                }
            }

        } catch (error) {
            console.error("Erreur d'authentification :", error);

            alert(
                "Erreur : " +
                (error.message || "Connexion impossible.")
            );

        } finally {
            submit.disabled = false;
            submit.textContent = originalText;
        }
    };

    // ==========================================
    // DÉCONNEXION
    // ==========================================

    window.logoutUser = async function () {
        try {
            await logout();

            saveSession(null);

            if (typeof renderHomeGrid === "function") {
                renderHomeGrid();
            }

            if (typeof showToast === "function") {
                showToast("Déconnexion effectuée.");
            }

        } catch (error) {
            console.error("Erreur de déconnexion :", error);
            alert("Impossible de se déconnecter.");
        }
    };

    // ==========================================
    // FAVORIS PAR UTILISATEUR
    // ==========================================

    window.getFavorites = function () {
        const key = getFavoriteKey();

        if (!key) return [];

        try {
            return JSON.parse(
                localStorage.getItem(key) || "[]"
            );
        } catch {
            return [];
        }
    };

    window.toggleFavorite = function (gifId) {
        if (!identityUser) {
            if (typeof showToast === "function") {
                showToast("Connectez-vous pour ajouter aux favoris.");
            }

            window.openAuthModal("login");
            return;
        }

        const key = getFavoriteKey();

        let favorites = window.getFavorites();

        if (favorites.includes(gifId)) {
            favorites = favorites.filter(
                id => id !== gifId
            );

            if (typeof showToast === "function") {
                showToast("Retiré des favoris.");
            }

        } else {
            favorites.push(gifId);

            if (typeof showToast === "function") {
                showToast("Ajouté aux favoris !");
            }
        }

        localStorage.setItem(
            key,
            JSON.stringify(favorites)
        );

        if (typeof updateFavoriteBtnUI === "function") {
            updateFavoriteBtnUI();
        }

        if (typeof updateFavBadge === "function") {
            updateFavBadge();
        }
    };

    // ==========================================
    // INITIALISATION
    // ==========================================

    try {
        if (typeof handleAuthCallback === "function") {
            await handleAuthCallback();
        }

        const user = await getUser();

        saveSession(user);

        console.log(
            "GIFHUB Identity initialisé.",
            user ? "Utilisateur connecté." : "Aucune session."
        );

    } catch (error) {
        console.error(
            "Erreur d'initialisation Netlify Identity :",
            error
        );
    }

})();
