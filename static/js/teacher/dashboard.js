document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadAssignments();
    setupModals();
    setupLogout();
});

async function loadClasses() {
    try {
        const response = await fetch('/get_classes');
        if (!response.ok) throw new Error('Klassen konnten nicht geladen werden');

        const classes = await response.json();
        const classList = document.getElementById('classList');

        classList.innerHTML = classes.map(cls => `
            <a href="/teacher/class?id=${cls.id}" class="list-group-item list-group-item-action">
                ${cls.label}
            </a>
        `).join('');
    } catch (error) {
        console.error('Fehler beim Laden der Klassen:', error);
        alert('Fehler beim Laden der Klassen');
    }
}

async function loadAssignments() {
    try {
        const response = await fetch('/get_wordlists');
        if (!response.ok) throw new Error('Aufgaben konnten nicht geladen werden');

        const assignments = await response.json();
        const assignmentList = document.getElementById('assignmentList');

        assignmentList.innerHTML = assignments.map(assignment => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${assignment.name}</h5>
                        <div>
                            <button class="btn btn-primary btn-sm add-words-btn me-2" 
                                    data-id="${assignment.wordlist_id}">
                                Wörter hinzufügen
                            </button>
                            <button class="btn btn-danger btn-sm delete-assignment-btn" 
                                    data-id="${assignment.wordlist_id}">
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.add-words-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const wordlistId = this.getAttribute('data-id');
                showAddWordsModal(wordlistId);
            });
        });

        document.querySelectorAll('.delete-assignment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const wordlistId = this.getAttribute('data-id');
                deleteAssignment(wordlistId);
            });
        });
    } catch (error) {
        console.error('Fehler beim Laden der Aufgaben:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

async function deleteAssignment(wordlistId) {
    if (!confirm('Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }

    try {
        const response = await fetch(`/delete_wordlist?wordlist_id=${wordlistId}`);
        if (!response.ok) throw new Error('Löschen fehlgeschlagen');

        loadAssignments();
        alert('Aufgabe erfolgreich gelöscht');
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen der Aufgabe');
    }
}

function showAddWordsModal(wordlistId) {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    document.getElementById('wordlistId').value = wordlistId;
    document.getElementById('wordlistName').value = '';
    document.getElementById('wordlistWords').value = '';
    modal.show();
}

function setupModals() {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));

    document.getElementById('newWordlistBtn').addEventListener('click', function() {
        document.getElementById('wordlistForm').reset();
        document.getElementById('wordlistId').value = '';
        modal.show();
    });

    document.getElementById('saveWordlist').addEventListener('click', async function() {
        const wordlistId = document.getElementById('wordlistId').value;
        const name = document.getElementById('wordlistName').value.trim();
        const wordsText = document.getElementById('wordlistWords').value.trim();

        if (!name) {
            alert('Bitte geben Sie einen Namen für die Aufgabe ein');
            return;
        }

        if (!wordsText) {
            alert('Bitte geben Sie mindestens ein Wort ein');
            return;
        }

        const words = wordsText.split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

        try {
            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    words: words
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Server-Fehler');
            }

            const result = await response.json();
            modal.hide();
            loadAssignments();
            alert(result.message || 'Erfolgreich gespeichert');
        } catch (error) {
            console.error('Speicherfehler:', error);
            alert(`Fehler beim Speichern: ${error.message}`);
        }
    });
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}