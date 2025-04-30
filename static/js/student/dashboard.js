document.addEventListener('DOMContentLoaded', function() {
    loadAssignments();
    setupLogout();
});

async function loadAssignments() {
    try {
        // Fetch all wordlists (assignments)
        const assignments = await fetch('/get_wordlists')
            .then(res => res.json());

        // Fetch student progress
        const progress = await fetch('/get_student_progress')
            .then(res => res.json());

        // Render assignments
        const assignmentList = document.getElementById('assignmentList');
        assignmentList.innerHTML = assignments.map(assignment => {
            const prog = progress[assignment.wordlist_id] || '0/0';
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${assignment.name}</h5>
                        <div class="progress mb-2">
                            <div class="progress-bar" 
                                style="width: ${calculateProgress(prog)}%">
                            </div>
                        </div>
                        <p class="card-text">${prog} Wörter beherrscht</p>
                        <a href="/student/training.html?id=${assignment.wordlist_id}" 
                           class="btn btn-primary">
                            Trainieren
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        // Render training pool checkboxes
        const poolList = document.getElementById('trainingPoolList');
        poolList.innerHTML = assignments.map(assignment => {
            const unmastered = calculateUnmastered(assignment.wordlist_id, progress);
            return `
                <div class="form-check mb-2">
                    <input class="form-check-input assignment-check" 
                           type="checkbox" 
                           value="${assignment.wordlist_id}"
                           id="pool-${assignment.wordlist_id}">
                    <label class="form-check-label" for="pool-${assignment.wordlist_id}">
                        ${assignment.name}
                        <span class="badge bg-primary rounded-pill ms-2">${unmastered}</span>
                    </label>
                </div>
            `;
        }).join('');

        // Setup training pool button
        document.getElementById('startTraining').addEventListener('click', function() {
            const selected = Array.from(document.querySelectorAll('.assignment-check:checked'))
                .map(el => el.value);
            if (selected.length === 0) {
                alert('Bitte wähle mindestens eine Aufgabe aus');
                return;
            }
            window.location.href = `/student/training.html?wordlist_ids=${selected.join(',')}`;
        });

    } catch (error) {
        console.error('Failed to load assignments:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

function calculateProgress(progressStr) {
    const [mastered, total] = progressStr.split('/').map(Number);
    return total > 0 ? Math.round((mastered / total) * 100) : 0;
}

function calculateUnmastered(wordlistId, progress) {
    const prog = progress[wordlistId] || '0/0';
    const [mastered, total] = prog.split('/').map(Number);
    return total - mastered;
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}