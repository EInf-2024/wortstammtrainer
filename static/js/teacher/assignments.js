document.addEventListener('DOMContentLoaded', function() {
    loadAssignments();
    setupModals();
    setupLogout();
});

async function loadAssignments() {
    try {
        const response = await fetch('/get_wordlists');
        if (!response.ok) throw new Error('Aufgaben konnten nicht geladen werden');

        const assignments = await response.json();
        const tableBody = document.getElementById('assignmentTable');

        tableBody.innerHTML = assignments.map(assignment => `
            <tr>
                <td>${assignment.name}</td>
                <td>${assignment.word_count || 0}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-primary add-words-btn" 
                                data-id="${assignment.wordlist_id}">
                            Wörter hinzufügen
                        </button>
                        <button class="btn btn-sm btn-danger delete-assignment-btn" 
                                data-id="${assignment.wordlist_id}">
                            Löschen
                        </button>
                    </div>
                </td>
            </tr>
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
                if (confirm('Möchten Sie diese Aufgabe wirklich löschen?')) {
                    deleteAssignment(wordlistId);
                }
            });
        });
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

async function deleteAssignment(wordlistId) {
    try {
        const response = await fetch(`/delete_wordlist?wordlist_id=${wordlistId}`);
        if (!response.ok) throw new Error('Löschen fehlgeschlagen');

        loadAssignments();
    } catch (error) {
        console.error('Löschfehler:', error);
        alert('Fehler beim Löschen der Aufgabe');
    }
}

function showAddWordsModal(wordlistId) {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));
    document.getElementById('wordlistId').value = wordlistId;

    // Load existing name if editing
    const assignmentRow = document.querySelector(`[data-id="${wordlistId}"]`)?.closest('tr');
    if (assignmentRow) {
        document.getElementById('wordlistName').value = assignmentRow.querySelector('td:first-child').textContent;
    } else {
        document.getElementById('wordlistName').value = '';
    }

    document.getElementById('wordlistWords').value = '';
    modal.show();
}

function setupModals() {
    const modal = new bootstrap.Modal(document.getElementById('wordlistModal'));

    document.getElementById('newAssignmentBtn').addEventListener('click', function() {
        document.getElementById('wordlistForm').reset();
        document.getElementById('wordlistId').value = '';
        modal.show();
    });

    document.getElementById('saveWordlist').addEventListener('click', async function() {
        const wordlistId = document.getElementById('wordlistId').value;
        const name = document.getElementById('wordlistName').value.trim();
        const wordsText = document.getElementById('wordlistWords').value.trim();

        if (!name) {
            alert('Bitte geben Sie einen Namen ein');
            return;
        }

        if (!wordsText) {
            alert('Bitte geben Sie Wörter ein');
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

            modal.hide();
            loadAssignments();
            alert('Erfolgreich gespeichert');
        } catch (error) {
            console.error('Speicherfehler:', error);
            alert(`Fehler: ${error.message}`);
        }
    });
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}