document.addEventListener('DOMContentLoaded', function() {
    loadAssignments();
    setupModals();
    setupLogout();
});

async function loadAssignments() {
    try {
        const response = await fetch('/get_wordlists');
        if (!response.ok) throw new Error('Failed to fetch assignments');

        const assignments = await response.json();
        const tableBody = document.getElementById('assignmentTable');

        tableBody.innerHTML = assignments.map(assignment => `
            <tr>
                <td>${assignment.name}</td>
                <td>${assignment.word_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary add-words-btn" 
                            data-id="${assignment.wordlist_id}">
                        Wörter hinzufügen
                    </button>
                    <button class="btn btn-sm btn-danger delete-assignment-btn" 
                            data-id="${assignment.wordlist_id}">
                        Löschen
                    </button>
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
        console.error('Error loading assignments:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

async function deleteAssignment(wordlistId) {
    try {
        const response = await fetch(`/delete_wordlist?wordlist_id=${wordlistId}`);
        if (!response.ok) throw new Error('Failed to delete assignment');

        loadAssignments();
    } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Fehler beim Löschen der Aufgabe');
    }
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
        const name = document.getElementById('wordlistName').value;
        const words = document.getElementById('wordlistWords').value;

        if (!name || !words) {
            alert('Bitte füllen Sie alle Felder aus');
            return;
        }

        try {
            const endpoint = wordlistId ? '/edit_wordlist' : '/create_wordlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wordlist_id: wordlistId || null,
                    name,
                    words
                })
            });

            if (!response.ok) throw new Error('Failed to save wordlist');

            modal.hide();
            loadAssignments();
        } catch (error) {
            console.error('Error saving wordlist:', error);
            alert('Fehler beim Speichern der Wortliste');
        }
    });
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}