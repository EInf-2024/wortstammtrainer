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
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                    // If not JSON, use status text
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
});
