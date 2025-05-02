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

        // Render wordlist cards as a vertical list (outside trainingpool)
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
                    <div class="d-flex align-items-center">
                        <a href="training.html?id=${wl.wordlist_id}" class="btn btn-primary btn-sm me-2 einzeltraining-btn">
                            Einzeltraining
                        </a>
                        <button class="btn btn-outline-danger btn-sm reset-btn" data-wordlist-id="${wl.wordlist_id}">
                            Zurücksetzen
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Render training pool checkboxes (only show total unmastered words)
        const poolList = document.getElementById('trainingPoolList');
        poolList.innerHTML = wordlists.map(wl => {
            const prog = progress[wl.wordlist_id] || { unmastered: 0 };
            return `
                <div class="form-check mb-2">
                    <input class="form-check-input wordlist-checkbox" 
                           type="checkbox" 
                           value="${wl.wordlist_id}"
                           id="pool-${wl.wordlist_id}"
                           ${prog.unmastered === 0 ? 'disabled' : ''}>
                    <label class="form-check-label" for="pool-${wl.wordlist_id}">
                        ${wl.name}
                        <span class="badge bg-primary rounded-pill ms-2">${prog.unmastered} im Pool</span>
                    </label>
                </div>
            `;
        }).join('');

        setupResetButtons();
    } catch (error) {
        alert(error.message);
    }
}

function setupResetButtons() {
    document.querySelectorAll('.reset-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const wordlistId = this.getAttribute('data-wordlist-id');
            if (!confirm('Möchtest du wirklich den Fortschritt für diese Wortliste zurücksetzen?')) return;
            try {
                const response = await fetch('/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wordlist_id: wordlistId })
                });
                if (!response.ok) throw new Error('Fehler beim Zurücksetzen');
                await loadWordlists();
            } catch (error) {
                alert(error.message);
            }
        });
    });
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
        // Only allow wordlists with unmastered words
        const checkboxes = Array.from(document.querySelectorAll('.wordlist-checkbox:checked'));
        if (checkboxes.length === 0) {
            alert('Bitte wähle mindestens eine Wortliste aus.');
            return;
        }
        // Check if at least one selected wordlist has unmastered words (not disabled)
        const enabledChecked = checkboxes.filter(cb => !cb.disabled);
        if (enabledChecked.length === 0) {
            alert('Alle ausgewählten Wortlisten sind bereits gemeistert.');
            return;
        }
        const ids = enabledChecked.map(cb => cb.value);
        window.location.href = `training.html?wordlist_ids=${ids.join(',')}`;
    });
}

// Optionally, reload wordlists after Einzeltraining
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('einzeltraining-btn')) {
        setTimeout(() => loadWordlists(), 1000); // reload after a short delay
    }
});
