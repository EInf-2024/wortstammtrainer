document.addEventListener('DOMContentLoaded', function() {
    loadWordlists();
    setupModal();
});

async function loadWordlists() {
    const wordlists = await fetch('/get_wordlists')
        .then(res => res.json());

    const tbody = document.querySelector('#assignmentsTable tbody');
    tbody.innerHTML = wordlists.map(wl => `
        <tr data-id="${wl.wordlist_id}">
            <td>${wl.name}</td>
            <td>${wl.word_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn">Bearbeiten</button>
                <button class="btn btn-sm btn-danger delete-btn">Löschen</button>
            </td>
        </tr>
    `).join('');
}

function setupModal() {
    const modal = new bootstrap.Modal('#wordlistModal');

    // New wordlist
    document.getElementById('newWordlistBtn').addEventListener('click', () => {
        document.getElementById('wordlistForm').reset();
        modal.show();
    });

    // Edit wordlist
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const wordlistId = this.closest('tr').dataset.id;
            const wordlist = await fetch(`/get_wordlist?id=${wordlistId}`)
                .then(res => res.json());

            document.getElementById('wordlistId').value = wordlistId;
            document.getElementById('wordlistName').value = wordlist.name;
            document.getElementById('wordlistWords').value = wordlist.words.join('\n');
            modal.show();
        });
    });

    // Save wordlist
    document.getElementById('saveWordlist').addEventListener('click', async function() {
        const form = document.getElementById('wordlistForm');
        const wordlistId = form.wordlistId.value;
        const method = wordlistId ? 'POST' : 'PUT';
        const url = wordlistId ? '/edit_wordlist' : '/create_wordlist';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordlist_id: wordlistId,
                name: form.wordlistName.value,
                words: form.wordlistWords.value.split('\n')
            })
        });

        modal.hide();
        loadWordlists();
    });
}