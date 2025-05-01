document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadWordlists();
    setupModals();
    setupLogout();
});

async function loadClasses() {
    try {
        const response = await fetch('get_classes');
        if (!response.ok) throw new Error('Klassen konnten nicht geladen werden');
        const classes = await response.json();

        const classList = document.getElementById('classList');
        if (classList) {
            classList.innerHTML = classes.map(cls => `
                <a href="class.html?id=${cls.id}" class="list-group-item list-group-item-action">
                    ${cls.label}
                </a>
            `).join('');
        }
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Klassen');
    }
}

async function loadWordlists() {
    try {
        const response = await fetch('get_wordlists');
        if (!response.ok) throw new Error('Wortlisten konnten nicht geladen werden');
        const wordlists = await response.json();

        const container = document.getElementById('wordlistContainer');
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
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Wortlisten');
    }
}

async function deleteWordlist(wordlistId) {
    if (!confirm('Wortliste wirklich löschen?')) return;

    try {
        const response = await fetch('/delete_wordlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordlist_id: wordlistId // Already parsed as integer
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Löschen fehlgeschlagen');
        }

        // Remove the element immediately
        document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`)?.remove();
        alert('Wortliste erfolgreich gelöscht');
    } catch (error) {
        console.error('Fehler:', error);
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
        const words = document.getElementById('wordlistWords').value.trim();

        if (!name || !words) {
            alert('Bitte füllen Sie alle Felder aus');
            return;
        }

        try {
            const payload = {
                name: name,
                words: words.split('\n')
                           .map(w => w.trim())
                           .filter(w => w) // Remove empty lines
            };

            // Add wordlist_id only when editing
            if (wordlistId) {
                payload.wordlist_id = parseInt(wordlistId);
            }

            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Speichern fehlgeschlagen');
            }

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gespeichert');
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern: ' + error.message);
        }
    });

    // Delete button in modal
    document.getElementById('deleteWordlistBtn').addEventListener('click', async () => {
        const wordlistId = parseInt(document.getElementById('wordlistId').value);
        if (!confirm('Wortliste wirklich löschen?')) return;

        try {
            const response = await fetch('/delete_wordlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wordlist_id: wordlistId
                })
            });

            if (!response.ok) throw new Error('Löschen fehlgeschlagen');

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gelöscht');
        } catch (error) {
            console.error('Fehler:', error);
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

    // Since we removed /get_wordlist_words, we'll initialize with empty words
    // Teacher can add new words when editing
    document.getElementById('wordlistWords').value = '';
    modal.show();
}

function setupLogout() {
    document.querySelector('.logout-btn')?.addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}