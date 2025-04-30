document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        // Corrected ID references to match HTML
        const username = document.getElementById("email").value; // Changed from "name" to "email"
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("login", { // Changed from "/api/login"
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username, // Matches the name="username" in HTML
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Set auth cookie as required by backend
                document.cookie = `auth=${data.access_token}; path=/`;

                // Corrected redirect paths
                if (data.role === "student") {
                    window.location.href = "student"; // Simplified path
                } else if (data.role === "teacher") {
                    window.location.href = "teacher"; // Simplified path
                }
            } else {
                const errorData = await response.json();
                alert(`Login fehlgeschlagen: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Ein Verbindungsfehler ist aufgetreten");
        }
    });
});