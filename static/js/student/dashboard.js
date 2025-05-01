document.addEventListener('DOMContentLoaded', function() {
    loadWordlists();
    setupLogout();
});

async function loadWordlists() {
    try {
        // Fetch wordlists
        const wordlistsResponse = await fetch('/get_wordlists');
        if (!wordlistsResponse.ok) throw new Error('Wortlisten konnten nicht geladen werden');
        const wordlists = await wordlistsResponse.json();

        // Fetch progress (for training pool)
        const progressResponse = await fetch('/get_student_progress');
        const progress = progressResponse.ok ? await progressResponse.json() : {};

        // Render wordlist cards
        const container = document.getElementById('wordlistContainer');
        container.innerHTML = wordlists.map(wl => {
            const prog = progress[wl.wordlist_id] || '0/0';
            const [mastered, total] = prog.split('/').map(Number);
            const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

            return `
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${wl.name}</h5>
                            <div class="progress mb-3">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                            <div class="d-grid gap-2">
                                <a href="training.html?id=${wl.wordlist_id}" class="btn btn-primary">
                                    Einzeltraining
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Render training pool checkboxes
        const poolList = document.getElementById('trainingPoolList');
        poolList.innerHTML = wordlists.map(wl => {
            const prog = progress[wl.wordlist_id] || '0/0';
            const [mastered, total] = prog.split('/').map(Number);
            const unmastered = total - mastered;

            return `
                <div class="form-check mb-2">
                    <input class="form-check-input wordlist-checkbox" 
                           type="checkbox" 
                           value="${wl.wordlist_id}"
                           id="pool-${wl.wordlist_id}"
                           ${unmastered === 0 ? 'disabled' : ''}>
                    <label class="form-check-label" for="pool-${wl.wordlist_id}">
                        ${wl.name}
                        <span class="badge bg-primary rounded-pill ms-2">${unmastered}</span>
                    </label>
                </div>
            `;
        }).join('');

        // Setup training pool button
        document.getElementById('startTraining').addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.wordlist-checkbox:checked:not(:disabled)'))
                .map(el => el.value);

            if (selected.length === 0) {
                alert('Bitte wähle mindestens eine Wortliste aus');
                return;
            }

            window.location.href = `training.html?wordlist_ids=${selected.join(',')}`;
        });

    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Daten');
    }
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}