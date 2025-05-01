document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadWordlists();
    setupModals();
    setupLogout();
});

async function loadClasses() {
    try {
        const response = await fetch('get_classes');  // Removed leading /
        if (!response.ok) throw new Error('Klassen konnten nicht geladen werden');
        const classes = await response.json();

        const classList = document.getElementById('classList');
        classList.innerHTML = classes.map(cls => `
            <a href="class.html?id=${cls.id}" class="list-group-item list-group-item-action">
                ${cls.label}
            </a>
        `).join('');
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Klassen');
    }
}

async function loadWordlists() {
    try {
        const response = await fetch('get_wordlists');  // Removed leading /
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
            btn.addEventListener('click', () => showWordlistModal(btn.dataset.id));
        });

        document.querySelectorAll('.delete-wordlist').forEach(btn => {
            btn.addEventListener('click', () => deleteWordlist(btn.dataset.id));
        });
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Wortlisten');
    }
}

async function deleteWordlist(wordlistId) {
    if (!confirm('Wortliste wirklich löschen?')) return;

    try {
        const response = await fetch('delete_wordlist', {  // Removed leading /
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wordlist_id: wordlistId })
        });

        if (!response.ok) throw new Error('Löschen fehlgeschlagen');

        loadWordlists();
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Löschen');
    }
}

function setupModals() {
    const modal = new bootstrap.Modal('#wordlistModal');

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
            const endpoint = wordlistId ? 'edit_wordlist' : 'create_wordlist';  // Removed leading /
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wordlist_id: wordlistId || undefined,
                    name: name,
                    words: words.split('\n').filter(w => w.trim())
                })
            });

            if (!response.ok) throw new Error('Speichern fehlgeschlagen');

            modal.hide();
            loadWordlists();
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Speichern');
        }
    });

    // Delete button in modal
    document.getElementById('deleteWordlistBtn').addEventListener('click', async () => {
        const wordlistId = document.getElementById('wordlistId').value;
        if (!confirm('Wortliste wirklich löschen?')) return;

        try {
            const response = await fetch('delete_wordlist', {  // Removed leading /
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wordlist_id: wordlistId })
            });

            if (!response.ok) throw new Error('Löschen fehlgeschlagen');

            modal.hide();
            loadWordlists();
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen');
        }
    });

    // Proper modal dismissal
    document.querySelector('.modal .btn-close').addEventListener('click', () => modal.hide());
    document.querySelector('.modal .btn-secondary').addEventListener('click', () => modal.hide());
}

async function showWordlistModal(wordlistId) {
    const modal = new bootstrap.Modal('#wordlistModal');
    const wordlistCard = document.querySelector(`.wordlist-card[data-id="${wordlistId}"]`);

    document.getElementById('wordlistId').value = wordlistId;
    document.getElementById('wordlistName').value = wordlistCard.querySelector('.card-title').textContent;
    document.getElementById('deleteWordlistBtn').classList.remove('d-none');

    // Load words for editing
    try {
        const response = await fetch(`get_wordlist_words?wordlist_id=${wordlistId}`);  // Removed leading /
        if (!response.ok) throw new Error('Wörter konnten nicht geladen werden');
        const words = await response.json();
        document.getElementById('wordlistWords').value = words.join('\n');
        modal.show();
    } catch (error) {
        console.error('Fehler:', error);
        alert('Wörter konnten nicht geladen werden');
    }
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}