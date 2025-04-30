document.addEventListener('DOMContentLoaded', function() {
    loadTeacherDashboard();
});

function loadTeacherDashboard() {

    const classes = [
        { id: 1, name: '7a', students: 25 },
        { id: 2, name: '8b', students: 22 },
        { id: 3, name: '9c', students: 20 }
    ];

    const assignments = [
        {
            id: 1,
            name: 'Grundwortschatz',
            classes: ['7a', '8b'],
            words: 50
        },
        {
            id: 2,
            name: 'Verben Konjugation',
            classes: ['8b'],
            words: 30
        },
        {
            id: 3,
            name: 'Adjektive',
            classes: ['9c'],
            words: 25
        }
    ];


    document.getElementById('classCount').textContent = classes.length;
    document.getElementById('assignmentCount').textContent = assignments.length;
    document.getElementById('studentCount').textContent = classes.reduce((sum, cls) => sum + cls.students, 0);


    const assignmentsList = document.getElementById('currentAssignments');
    assignmentsList.innerHTML = assignments.slice(0, 2).map(assignment => `
        <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6>${assignment.name}</h6>
                    <small class="text-muted">${assignment.words} Wörter | Klassen: ${assignment.classes.join(', ')}</small>
                </div>
            </div>
        </div>
    `).join('');


    const classList = document.getElementById('classList');
    classList.innerHTML = classes.map(cls => `
        <a href="/teacher/class.html?id=${cls.id}" class="list-group-item list-group-item-action">
            ${cls.name} (${cls.students} Schüler)
        </a>
    `).join('');
}