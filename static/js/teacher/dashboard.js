document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadAssignments();
    setupModals();
    setupLogout();
});

// Load teacher's classes
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

// Load all assignments
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
                            <button class="btn btn-primary btn-sm me-2 add-words-btn" 
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

        // Add event listeners
        document.querySelectorAll('.add-words-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                showAddWordsModal(this.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.delete-assignment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteAssignment(this.getAttribute('data-id'));
            });
        });
    } catch (error) {
        console.error('Fehler beim Laden der Aufgaben:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

// Delete an assignment
async function deleteAssignment(wordlistId) {
    if (!confirm('Möchten Sie diese Aufgabe wirklich löschen?')) return;

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

// Show modal for adding/editing words
function showAddWordsModal(wordlistId) {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    document.getElementById('wordlistId').value = wordlistId || '';
    document.getElementById('wordlistName').value = wordlistId
        ? document.querySelector(`[data-id="${wordlistId}"]`).closest('.card').querySelector('.card-title').textContent
        : '';
    document.getElementById('wordlistWords').value = '';
    modal.show();
}

// Setup modal interactions
function setupModals() {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));

    document.getElementById('newWordlistBtn').addEventListener('click', () => showAddWordsModal());

    document.getElementById('saveWordlist').addEventListener('click', async function() {
        const wordlistId = document.getElementById('wordlistId').value;
        const name = document.getElementById('wordlistName').value.trim();
        const wordsText = document.getElementById('wordlistWords').value.trim();

        // Validation
        if (!name) {
            alert('Bitte geben Sie einen Namen ein');
            return;
        }

        if (!wordsText) {
            alert('Bitte geben Sie Wörter ein');
            return;
        }

        // Prepare data for backend
        const words = wordsText.split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

        try {
            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    words: words,
                    ...(wordlistId && { wordlist_id: wordlistId }) // Only include if editing
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Server-Fehler');
            }

            modal.hide();
            loadAssignments();
            alert('Erfolgreich gespeichert');
        } catch (error) {
            console.error('Speicherfehler:', error);
            alert(`Fehler: ${error.message}`);
        }
    });
}

// Logout handler
function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}