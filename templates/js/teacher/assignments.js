
document.addEventListener('DOMContentLoaded', function() {
    loadAssignments();


    document.getElementById('newAssignmentBtn').addEventListener('click', showAssignmentModal);
    document.getElementById('saveAssignmentBtn').addEventListener('click', saveAssignment);
});

function loadAssignments() {

    const assignments = [
        { id: 1, name: 'Grundwortschatz', class: '7a', words: 50 },
        { id: 2, name: 'Verben Konjugation', class: '8b', words: 30 },
        { id: 3, name: 'Adjektive', class: '9c', words: 25 }
    ];

    const tbody = document.querySelector('#assignmentsTable tbody');
    tbody.innerHTML = assignments.map(assignment => `
        <tr>
            <td>${assignment.name}</td>
            <td>${assignment.class}</td>
            <td>${assignment.words}</td>
            <td>
                <button class="btn btn-sm btn-primary">Bearbeiten</button>
                <button class="btn btn-sm btn-danger">Löschen</button>
            </td>
        </tr>
    `).join('');
}

function showAssignmentModal() {
    document.getElementById('assignmentModal').classList.add('show');
    document.getElementById('assignmentModal').style.display = 'block';
}

function saveAssignment() {

    console.log('Saving new assignment');
    document.getElementById('assignmentModal').classList.remove('show');
    document.getElementById('assignmentModal').style.display = 'none';
}