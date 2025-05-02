document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadWordlists();
    setupModals();
    setupLogout();
});

async function loadClasses() {
    try {
        const response = await fetch('/get_classes');
        if (!response.ok) {
            const error = await response.json();
            console.error('Server error:', error);
            throw new Error(error.message || 'Failed to load classes');
        }

        const classes = await response.json();
        console.log('Classes loaded:', classes);

        const classList = document.getElementById('classList');
        if (!classList) return;

        if (classes.length === 0) {
            classList.innerHTML = '<div class="list-group-item">Keine Klassen gefunden</div>';
            return;
        }

        classList.innerHTML = classes.map(cls => `
            <a href="class.html?id=${cls.id}" class="list-group-item list-group-item-action">
                ${cls.label}
            </a>
        `).join('');

    } catch (error) {
        console.error('Error loading classes:', error);
        alert('Fehler beim Laden der Klassen: ' + error.message);
    }
}

async function loadWordlists() {
    try {
        const response = await fetch('/get_wordlists');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load wordlists');
        }

        const wordlists = await response.json();
        console.log('Wordlists loaded:', wordlists);

        const container = document.getElementById('wordlistContainer');
        if (!container) return;

        if (wordlists.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Keine Wortlisten vorhanden</div>';
            return;
        }

        container.innerHTML = wordlists.map(wl => `
            <div class="card mb-3 wordlist-card" data-id="${wl.wordlist_id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${wl.name}</h5>
                        <div>
                            <button class="btn btn-sm btn-primary edit-wordlist me-2" 
                                    data-id="${wl.wordlist_id}">
                                Bearbeiten
                            </button>
                            <button class="btn btn-sm btn-danger delete-wordlist" 
                                    data-id="${wl.wordlist_id}">
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        document.querySelectorAll('.edit-wordlist').forEach(btn => {
            btn.addEventListener('click', () => {
                const wordlistId = parseInt(btn.dataset.id);
                console.log('Editing wordlist ID:', wordlistId);
                showWordlistModal(wordlistId);
            });
        });

        document.querySelectorAll('.delete-wordlist').forEach(btn => {
            btn.addEventListener('click', () => {
                const wordlistId = parseInt(btn.dataset.id);
                console.log('Deleting wordlist ID:', wordlistId);
                deleteWordlist(wordlistId);
            });
        });

    } catch (error) {
        console.error('Error loading wordlists:', error);
        alert('Fehler beim Laden der Wortlisten: ' + error.message);
    }
}

async function deleteWordlist(wordlistId) {
    if (!confirm('Wortliste wirklich löschen?')) {
        console.log('Deletion cancelled by user');
        return;
    }

    try {
        console.log('Attempting to delete wordlist ID:', wordlistId);
        const response = await fetch('/delete_wordlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wordlist_id: wordlistId })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Delete error:', error);
            throw new Error(error.message || 'Löschen fehlgeschlagen');
        }

        // Remove from UI
        const card = document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`);
        if (card) {
            card.remove();
            console.log('Wordlist removed from UI');
        }

        alert('Wortliste erfolgreich gelöscht');
    } catch (error) {
        console.error('Error deleting wordlist:', error);
        alert('Fehler beim Löschen: ' + error.message);
    }
}

function setupModals() {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    if (!modal) {
        console.error('Wordlist modal not found');
        return;
    }

    // New wordlist button
    document.getElementById('newWordlistBtn')?.addEventListener('click', () => {
        console.log('Creating new wordlist');
        document.getElementById('wordlistForm')?.reset();
        document.getElementById('wordlistId').value = '';
        document.getElementById('deleteWordlistBtn').classList.add('d-none');
        modal.show();
    });

    // Save button
    document.getElementById('saveWordlist')?.addEventListener('click', async () => {
        const wordlistId = document.getElementById('wordlistId').value;
        const name = document.getElementById('wordlistName').value.trim();
        const wordsText = document.getElementById('wordlistWords').value.trim();

        console.log('Saving wordlist:', { wordlistId, name, wordsText });

        if (!name) {
            alert('Bitte geben Sie einen Namen ein');
            return;
        }

        const words = wordsText.split('\n')
            .map(w => w.trim())
            .filter(w => w);

        if (words.length === 0) {
            alert('Bitte geben Sie mindestens ein Wort ein');
            return;
        }

        try {
            const payload = {
                name: name,
                words: wordsText // Send as text with newlines
            };

            if (wordlistId) {
                payload.wordlist_id = parseInt(wordlistId);
            }

            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            console.log('Sending to', endpoint, 'with payload:', payload);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Save error:', error);
                throw new Error(error.message || 'Speichern fehlgeschlagen');
            }

            const result = await response.json();
            console.log('Save successful:', result);

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gespeichert');
        } catch (error) {
            console.error('Error saving wordlist:', error);
            alert('Fehler beim Speichern: ' + error.message);
        }
    });

    // Delete button in modal
    document.getElementById('deleteWordlistBtn')?.addEventListener('click', async () => {
        const wordlistId = parseInt(document.getElementById('wordlistId').value);
        if (!confirm('Wortliste wirklich löschen?')) {
            console.log('Modal deletion cancelled by user');
            return;
        }

        try {
            console.log('Deleting wordlist from modal, ID:', wordlistId);
            const response = await fetch('/delete_wordlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wordlist_id: wordlistId })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Modal delete error:', error);
                throw new Error(error.message || 'Löschen fehlgeschlagen');
            }

            modal.hide();
            loadWordlists(); // Refresh the list
            alert('Wortliste erfolgreich gelöscht');
        } catch (error) {
            console.error('Error deleting wordlist from modal:', error);
            alert('Fehler beim Löschen: ' + error.message);
        }
    });

    // Modal dismissal
    document.querySelector('.modal .btn-close')?.addEventListener('click', () => {
        console.log('Modal closed via X button');
        modal.hide();
    });
    document.querySelector('.modal .btn-secondary')?.addEventListener('click', () => {
        console.log('Modal closed via cancel button');
        modal.hide();
    });
}

async function showWordlistModal(wordlistId) {
    console.log('Showing modal for wordlist ID:', wordlistId);
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    const wordlistCard = document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`);

    if (!wordlistCard) {
        console.error('Wordlist card not found for ID:', wordlistId);
        return;
    }

    document.getElementById('wordlistId').value = wordlistId;
    document.getElementById('wordlistName').value = wordlistCard.querySelector('.card-title').textContent;
    document.getElementById('deleteWordlistBtn').classList.remove('d-none');

    // Initialize with empty words (your backend doesn't provide words for editing)
    document.getElementById('wordlistWords').value = '';
    modal.show();
}

function setupLogout() {
    document.querySelector('.logout-btn')?.addEventListener('click', function() {
        console.log('Logging out...');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}