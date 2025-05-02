document.addEventListener('DOMContentLoaded', function() {
    loadWordlists();
    setupLogout();
    setupTrainingPoolButton();
});

async function loadWordlists() {
    try {
        // Fetch wordlists
        const wordlistsResponse = await fetch('/get_wordlists');
        if (!wordlistsResponse.ok) throw new Error('Wortlisten konnten nicht geladen werden');
        const wordlists = await wordlistsResponse.json();

        // Fetch progress
        const progressResponse = await fetch('/get_student_progress');
        const progress = progressResponse.ok ? await progressResponse.json() : {};

        // Render wordlist cards as a vertical list
        const container = document.getElementById('wordlistContainer');
        container.innerHTML = wordlists.map(wl => {
            const prog = progress[wl.wordlist_id] || { mastered: 0, total: 0, unmastered: 0 };
            return `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <span>${wl.name}</span>
                        <span class="badge bg-secondary ms-2">${prog.mastered}/${prog.total} gemeistert</span>
                        <span class="badge bg-info ms-2">${prog.total} Wörter</span>
                    </div>
                    <a href="training.html?id=${wl.wordlist_id}" class="btn btn-primary btn-sm">
                        Einzeltraining
                    </a>
                </div>
            `;
        }).join('');

        // Render training pool checkboxes
        const poolList = document.getElementById('trainingPoolList');
        poolList.innerHTML = wordlists.map(wl => {
            const prog = progress[wl.wordlist_id] || { mastered: 0, total: 0, unmastered: 0 };
            return `
                <div class="form-check mb-2">
                    <input class="form-check-input wordlist-checkbox" 
                           type="checkbox" 
                           value="${wl.wordlist_id}"
                           id="pool-${wl.wordlist_id}">
                    <label class="form-check-label" for="pool-${wl.wordlist_id}">
                        ${wl.name}
                        <span class="badge bg-primary rounded-pill ms-2">${prog.unmastered} im Pool</span>
                        <span class="ms-2 text-muted"><small>(${prog.mastered}/${prog.total})</small></span>
                    </label>
                </div>
            `;
        }).join('');
    } catch (error) {
        alert(error.message);
    }
}

function setupLogout() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            window.location.href = "/";
        });
    }
}

function setupTrainingPoolButton() {
    const btn = document.getElementById('startTraining');
    if (!btn) return;
    btn.addEventListener('click', function() {
        const checked = Array.from(document.querySelectorAll('.wordlist-checkbox:checked'))
            .map(cb => cb.value);
        if (checked.length === 0) {
            alert('Bitte wähle mindestens eine Wortliste aus.');
            return;
        }
        window.location.href = `training.html?wordlist_ids=${checked.join(',')}`;
    });
}
