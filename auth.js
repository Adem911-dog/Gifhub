(async () => {
    const { signup, login, logout, getUser, handleAuthCallback } =
        await import("https://esm.sh/@netlify/identity");

    let identityUser = null;

    const getUsername = user =>
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Utilisateur";

    function saveSession(user) {
        identityUser = user;

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
        } else {
            currentUser = null;
            localStorage.removeItem("gifhub_session_user");
        }

        if (typeof updateUserUI === "function") updateUserUI();
        if (typeof updateFavoriteBtnUI === "function") updateFavoriteBtnUI();
    }

    window.openAuthModal = function () {
        document.getElementById("auth-modal")?.classList.add("active");
    };

    window.toggleAuthMode = function () {
        const title = document.querySelector("#auth-modal h2");
        const button = document.getElementById("auth-toggle-btn");
        const submit = document.getElementById("auth-submit-btn");

        const isLogin = submit?.textContent.toLowerCase().includes("connexion");

        if (title) title.textContent = isLogin ? "Créer un compte" : "Connexion";
        if (submit) submit.textContent = isLogin ? "S'inscrire" : "Connexion";
        if (button) button.textContent = isLogin
            ? "Déjà un compte ? Se connecter"
            : "Pas de compte ? S'inscrire";
    };

    window.handleAuthSubmit = async function (event) {
        event.preventDefault();

        const emailInput = document.getElementById("auth-username");
        const passwordInput = document.getElementById("auth-password");
        const submit = document.getElementById("auth-submit-btn");

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            alert("Remplis tous les champs.");
            return;
        }

        if (!email.includes("@")) {
            alert("Utilise une adresse e-mail valide.");
            return;
        }

        const isSignup = submit.textContent.toLowerCase().includes("inscrire");

        submit.disabled = true;

        try {
            if (isSignup) {
                await signup(email, password, {
                    full_name: email.split("@")[0]
                });

                alert("Compte créé ! Vérifie tes e-mails pour confirmer ton inscription, puis connecte-toi.");
                window.toggleAuthMode();
            } else {
                const user = await login(email, password);
                saveSession(user);

                document.getElementById("auth-modal")?.classList.remove("active");
            }
        } catch (error) {
            alert("Erreur : " + (error.message || "Impossible de se connecter."));
        } finally {
            submit.disabled = false;
        }
    };

    window.logoutUser = async function () {
        try {
            await logout();
            saveSession(null);
            location.reload();
        } catch (error) {
            alert("Erreur lors de la déconnexion.");
        }
    };

    window.getFavorites = function () {
        if (!identityUser) return [];

        return JSON.parse(
            localStorage.getItem("gifhub_favs_" + identityUser.id) || "[]"
        );
    };

    window.toggleFavorite = function (id) {
        if (!identityUser) {
            alert("Connecte-toi pour ajouter des favoris.");
            window.openAuthModal();
            return;
        }

        const key = "gifhub_favs_" + identityUser.id;
        let favorites = JSON.parse(localStorage.getItem(key) || "[]");

        if (favorites.includes(id)) {
            favorites = favorites.filter(item => item !== id);
        } else {
            favorites.push(id);
        }

        localStorage.setItem(key, JSON.stringify(favorites));

        if (typeof updateFavoriteBtnUI === "function") {
            updateFavoriteBtnUI();
        }
    };

    try {
        await handleAuthCallback();
        const user = await getUser();
        saveSession(user);
    } catch (error) {
        console.error("Netlify Identity :", error);
    }
})();
