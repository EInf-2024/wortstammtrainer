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
        console.error('Fehler:', error);
        alert('Klassen konnten nicht geladen werden');
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
                            <button class="btn btn-primary btn-sm me-2" 
                                    onclick="editAssignment('${assignment.wordlist_id}', '${assignment.name.replace(/'/g, "\\'")}')">
                                Bearbeiten
                            </button>
                            <button class="btn btn-danger btn-sm" 
                                    onclick="deleteAssignment('${assignment.wordlist_id}')">
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Fehler:', error);
        alert('Aufgaben konnten nicht geladen werden');
    }
}

async function deleteAssignment(wordlistId) {
    if (!confirm('Wirklich löschen?')) return;

    try {
        const response = await fetch(`/delete_wordlist?wordlist_id=${wordlistId}`);
        if (!response.ok) throw new Error('Löschen fehlgeschlagen');
        loadAssignments();
    } catch (error) {
        console.error('Fehler:', error);
        alert('Löschen fehlgeschlagen');
    }
}

function editAssignment(wordlistId, name) {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    document.getElementById('wordlistId').value = wordlistId;
    document.getElementById('wordlistName').value = name;
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
            alert('Bitte Namen eingeben');
            return;
        }

        if (!wordsText) {
            alert('Bitte Wörter eingeben');
            return;
        }

        // Send as raw text instead of array
        try {
            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    words: wordsText  // Send as raw text, not array
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Server error');
            }

            alert('Erfolgreich gespeichert');
            location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('Fehler: ' + error.message);
        }
    });
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}

// Make functions global for inline handlers
window.deleteAssignment = deleteAssignment;
window.editAssignment = editAssignment;