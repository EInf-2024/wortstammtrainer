document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadWordlists();
    setupModals();
    setupLogout();
});

async function loadClasses() {
    try {
        console.log("Loading classes..."); // Debug
        const response = await fetch('/get_classes');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Klassen konnten nicht geladen werden');
        }

        const classes = await response.json();
        console.log("Received classes data:", classes); // Debug

        const classList = document.getElementById('classList');
        if (classList) {
            if (classes.length === 0) {
                console.warn("No classes found in response"); // Debug
                classList.innerHTML = '<div class="list-group-item">Keine Klassen gefunden</div>';
            } else {
                classList.innerHTML = classes.map(cls => `
                    <a href="class.html?id=${cls.id}" class="list-group-item list-group-item-action">
                        ${cls.label}
                    </a>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden der Klassen:', error);
        alert('Fehler beim Laden der Klassen: ' + error.message);
    }
}

async function loadWordlists() {
    try {
        console.log("Loading wordlists..."); // Debug
        const response = await fetch('/get_wordlists');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Wortlisten konnten nicht geladen werden');
        }

        const wordlists = await response.json();
        console.log("Received wordlists data:", wordlists); // Debug

        const container = document.getElementById('wordlistContainer');
        if (wordlists.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Keine Wortlisten vorhanden</div>';
        } else {
            container.innerHTML = wordlists.map(wl => `
                <div class="card mb-3 wordlist-card" data-id="${wl.wordlist_id}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">${wl.name}</h5>
                            <div>
                                <button class="btn btn-sm btn-primary edit-wordlist me-2" data-id="${wl.wordlist_id}">
                                    Bearbeiten
                                </button>
                                <button class="btn btn-sm btn-danger delete-wordlist" data-id="${wl.wordlist_id}">
                                    Löschen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            document.querySelectorAll('.edit-wordlist').forEach(btn => {
                btn.addEventListener('click', () => showWordlistModal(parseInt(btn.dataset.id)));
            });

            document.querySelectorAll('.delete-wordlist').forEach(btn => {
                btn.addEventListener('click', () => deleteWordlist(parseInt(btn.dataset.id)));
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden der Wortlisten:', error);
        alert('Fehler beim Laden der Wortlisten: ' + error.message);
    }
}

async function deleteWordlist(wordlistId) {
    if (!confirm('Wortliste wirklich löschen?')) return;

    try {
        console.log("Deleting wordlist ID:", wordlistId); // Debug
        const response = await fetch('/delete_wordlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordlist_id: wordlistId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Delete error response:", errorData); // Debug
            throw new Error(errorData.message || 'Löschen fehlgeschlagen');
        }

        // Remove the element immediately
        document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`)?.remove();
        alert('Wortliste erfolgreich gelöscht');
    } catch (error) {
        console.error('Complete delete error:', error); // Debug
        alert('Fehler beim Löschen: ' + error.message);
    }
}

function setupModals() {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));

    // New wordlist button
    document.getElementById('newWordlistBtn').addEventListener('click', () => {
        document.getElementById('wordlistForm').reset();
        document.getElementById('wordlistId').value = '';
        document.getElementById('deleteWordlistBtn').classList.add('d-none');
        modal.show();
    });

    // Save button
    document.getElementById('saveWordlist').addEventListener('click', async () => {
        const wordlistId = document.getElementById('wordlistId').value;
        const name = document.getElementById('wordlistName').value.trim();
        const wordsText = document.getElementById('wordlistWords').value.trim();

        console.log("Saving wordlist - input values:"); // Debug
        console.log("ID:", wordlistId);
        console.log("Name:", name);
        console.log("Words text:", wordsText);

        // Process words correctly
        const words = wordsText.split('\n')
            .map(w => w.trim())
            .filter(w => w); // Remove empty lines

        console.log("Processed words array:", words); // Debug

        if (!name) {
            alert('Bitte geben Sie einen Namen für die Wortliste ein');
            return;
        }

        if (words.length === 0) {
            alert('Bitte geben Sie mindestens ein Wort ein');
            return;
        }

        try {
            const payload = {
                name: name,
                words: words  // Send as array
            };

            if (wordlistId) {
                payload.wordlist_id = parseInt(wordlistId);
            }

            console.log("Prepared payload:", payload); // Debug

            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Server error response:", errorData); // Debug
                throw new Error(errorData.message || 'Speichern fehlgeschlagen');
            }

            const result = await response.json();
            console.log("Success response:", result); // Debug

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gespeichert');
        } catch (error) {
            console.error('Complete save error:', error); // Debug
            alert('Fehler beim Speichern: ' + error.message);
        }
    });

    // Delete button in modal
    document.getElementById('deleteWordlistBtn').addEventListener('click', async () => {
        const wordlistId = parseInt(document.getElementById('wordlistId').value);
        if (!confirm('Wortliste wirklich löschen?')) return;

        try {
            console.log("Deleting wordlist from modal, ID:", wordlistId); // Debug
            const response = await fetch('/delete_wordlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wordlist_id: wordlistId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Löschen fehlgeschlagen');
            }

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gelöscht');
        } catch (error) {
            console.error('Modal delete error:', error); // Debug
            alert('Fehler beim Löschen: ' + error.message);
        }
    });

    // Modal dismissal
    document.querySelector('.modal .btn-close').addEventListener('click', () => modal.hide());
    document.querySelector('.modal .btn-secondary').addEventListener('click', () => modal.hide());
}

async function showWordlistModal(wordlistId) {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    const wordlistCard = document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`);

    document.getElementById('wordlistId').value = wordlistId;
    document.getElementById('wordlistName').value = wordlistCard.querySelector('.card-title').textContent;
    document.getElementById('deleteWordlistBtn').classList.remove('d-none');

    try {
        console.log("Loading wordlist data for ID:", wordlistId); // Debug
        const response = await fetch(`/get_wordlists?wordlist_id=${wordlistId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Wortlistendaten konnten nicht geladen werden');
        }

        const wordlistData = await response.json();
        console.log("Received wordlist data:", wordlistData); // Debug

        // Initialize words field - empty since we're not using /get_wordlist_words
        document.getElementById('wordlistWords').value = '';
        modal.show();
    } catch (error) {
        console.error('Error loading wordlist data:', error); // Debug
        document.getElementById('wordlistWords').value = '';
        modal.show();
    }
}

function setupLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location.href = '/';
        });
    }
}