
document.addEventListener('DOMContentLoaded', function() {
    loadStudentAssignments();
});

function loadStudentAssignments() {
    const assignments = [
        { id: 1, name: 'Grundwortschatz', mastered: 35, total: 50 },
        { id: 2, name: 'Verben Konjugation', mastered: 15, total: 30 },
        { id: 3, name: 'Adjektive', mastered: 10, total: 25 }
    ];

    const assignmentList = document.getElementById('assignmentList');
    assignmentList.innerHTML = assignments.map(assignment => `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">${assignment.name}</h5>
                <div class="progress mb-2">
                    <div class="progress-bar" role="progressbar" 
                        style="width: ${(assignment.mastered / assignment.total * 100)}%" 
                        aria-valuenow="${assignment.mastered}" 
                        aria-valuemin="0" 
                        aria-valuemax="${assignment.total}">
                    </div>
                </div>
                <p class="card-text">${assignment.mastered} von ${assignment.total} Wörtern beherrscht</p>
                <a href="/student/training.html?id=${assignment.id}" class="btn btn-primary">Trainieren</a>
            </div>
        </div>
    `).join('');
}