document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');

    if (classId) {
        loadClassData(classId);
    }
});

function loadClassData(classId) {

    const classes = {
        '1': { name: '7a', students: [
            { id: 1, name: 'Anna Müller', assignments: [
                { name: 'Grundwortschatz', mastered: 35, total: 50 },
                { name: 'Verben Konjugation', mastered: 15, total: 30 }
            ]},
            { id: 2, name: 'Tom Schneider', assignments: [
                { name: 'Grundwortschatz', mastered: 40, total: 50 },
                { name: 'Verben Konjugation', mastered: 10, total: 30 }
            ]}
        ]},
        '2': { name: '8b', students: [
            { id: 3, name: 'Lisa Bauer', assignments: [
                { name: 'Grundwortschatz', mastered: 25, total: 50 },
                { name: 'Verben Konjugation', mastered: 20, total: 30 }
            ]}
        ]},
        '3': { name: '9c', students: [
            { id: 4, name: 'Paul Weber', assignments: [
                { name: 'Adjektive', mastered: 15, total: 25 }
            ]}
        ]}
    };

    const classData = classes[classId];
    if (!classData) {
        window.location.href = '/teacher/teacher.html';
        return;
    }

    document.getElementById('className').textContent = `Klasse ${classData.name}`;

    const studentList = document.getElementById('studentList');
    studentList.innerHTML = classData.students.map(student => `
        <div class="list-group-item">
            <button class="btn w-100 text-start student-btn" data-student-id="${student.id}">
                ${student.name}
            </button>
            <div class="student-assignments mt-2" id="student-${student.id}" style="display: none;">
                ${student.assignments.map(assignment => `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>${assignment.name}</span>
                        <span>${assignment.mastered}/${assignment.total}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');


    document.querySelectorAll('.student-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = this.dataset.studentId;
            const assignmentsDiv = document.getElementById(`student-${studentId}`);
            assignmentsDiv.style.display = assignmentsDiv.style.display === 'none' ? 'block' : 'none';
        });
    });
}