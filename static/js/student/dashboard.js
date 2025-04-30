document.addEventListener('DOMContentLoaded', function() {
    loadAssignments();
    setupLogout();
});

async function loadAssignments() {
    try {
        // Fetch all assignments
        const assignmentsResponse = await fetch('/get_wordlists');
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments');
        const assignments = await assignmentsResponse.json();

        // Fetch student progress
        const progressResponse = await fetch('/get_student_progress');
        if (!progressResponse.ok) throw new Error('Failed to fetch progress');
        const progress = await progressResponse.json();

        // Render assignments
        const assignmentList = document.getElementById('assignmentList');
        assignmentList.innerHTML = assignments.map(assignment => {
            const prog = progress[assignment.wordlist_id] || '0/0';
            const [mastered, total] = prog.split('/').map(Number);
            const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${assignment.name}</h5>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="progress flex-grow-1 me-3">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                            <span>${prog} Wörter</span>
                        </div>
                        <div class="d-grid mt-3">
                            <a href="training.html?id=${assignment.wordlist_id}" 
                               class="btn btn-primary">
                                Trainieren
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Render training pool checkboxes
        const poolList = document.getElementById('trainingPoolList');
        poolList.innerHTML = assignments.map(assignment => {
            const prog = progress[assignment.wordlist_id] || '0/0';
            const [mastered, total] = prog.split('/').map(Number);
            const unmastered = total - mastered;

            return `
                <div class="form-check mb-2">
                    <input class="form-check-input assignment-check" 
                           type="checkbox" 
                           value="${assignment.wordlist_id}"
                           id="pool-${assignment.wordlist_id}"
                           ${unmastered === 0 ? 'disabled' : ''}>
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

            window.location.href = `training.html?wordlist_ids=${selected.join(',')}`;
        });
    } catch (error) {
        console.error('Error loading assignments:', error);
        alert('Fehler beim Laden der Aufgaben');
    }
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}