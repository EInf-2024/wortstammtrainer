document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        const username = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Debug: log the response for troubleshooting
                console.log("Login response:", data);

                // Defensive: check for required fields
                if (!data.access_token || !data.role) {
                    alert("Login fehlgeschlagen: Ungültige Serverantwort");
                    return;
                }

                document.cookie = `auth=${data.access_token}; path=/`;

                if (data.role === "student") {
                    window.location.href = "/student";
                } else if (data.role === "teacher") {
                    window.location.href = "/teacher";
                }
            } else {
                let errorMsg = "Unbekannter Fehler";
                try {
                    const errorData = await response.json();
                    console.log("Login error response:", errorData);
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = response.status === 401
                        ? "Falscher Benutzername oder Passwort"
                        : response.statusText || errorMsg;
                }
                alert(`Login fehlgeschlagen: ${errorMsg}`);
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Ein Verbindungsfehler ist aufgetreten");
        }
    });

    // Call setupLogout() if you are on a page with a logout button
    if (document.querySelector('.logout-btn')) {
        setupLogout();
    }
});

// Add this function at the end of the file or in your logout logic
function setupLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            window.location.href = "/";
        });
    }
}
