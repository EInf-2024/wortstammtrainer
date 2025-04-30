document.addEventListener('DOMContentLoaded', function() {
    loadClassStudents();
    setupLogout();
});

async function loadClassStudents() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');

        if (!classId) {
            window.location.href = 'teacher.html';
            return;
        }

        // Fetch class name
        const classResponse = await fetch(`/get_classes`);
        if (!classResponse.ok) throw new Error('Failed to fetch class');
        const classes = await classResponse.json();
        const cls = classes.find(c => c.id == classId);
        document.getElementById('className').textContent = cls?.label || 'Klasse';

        // Fetch students
        const studentResponse = await fetch(`/get_students?class_id=${classId}`);
        if (!studentResponse.ok) throw new Error('Failed to fetch students');
        const students = await studentResponse.json();

        const studentList = document.getElementById('studentList');
        studentList.innerHTML = students.map(student => `
            <div class="list-group-item list-group-item-action student-item">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${student.username}</span>
                    <button class="btn btn-sm btn-outline-primary toggle-progress-btn">
                        Fortschritt anzeigen
                    </button>
                </div>
                <div class="student-progress-container mt-2 d-none" data-student-id="${student.id}">
                    <!-- Progress will be loaded when clicked -->
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.toggle-progress-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const container = this.closest('.student-item').querySelector('.student-progress-container');
                const studentId = container.getAttribute('data-student-id');

                if (container.classList.contains('d-none')) {
                    await loadStudentProgress(studentId, container);
                }

                container.classList.toggle('d-none');
                this.textContent = container.classList.contains('d-none')
                    ? 'Fortschritt anzeigen'
                    : 'Fortschritt verbergen';
            });
        });
    } catch (error) {
        console.error('Error loading class students:', error);
        alert('Fehler beim Laden der Schüler');
        window.location.href = 'teacher.html';
    }
}

async function loadStudentProgress(studentId, container) {
    try {
        container.innerHTML = '<div class="text-center py-3">Lade Fortschritt...</div>';

        const response = await fetch(`/get_student?student_id=${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch progress');

        const progress = await response.json();

        if (Object.keys(progress).length === 0) {
            container.innerHTML = '<div class="text-center py-3">Keine Fortschrittsdaten verfügbar</div>';
            return;
        }

        container.innerHTML = `
            <div class="list-group">
                ${Object.entries(progress).map(([wordlistId, progressStr]) => {
                    const [mastered, total] = progressStr.split('/').map(Number);
                    const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
                    return `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <span>Aufgabe ${wordlistId}</span>
                                <span>${progressStr}</span>
                            </div>
                            <div class="progress mt-2">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading student progress:', error);
        container.innerHTML = '<div class="text-center py-3 text-danger">Fehler beim Laden des Fortschritts</div>';
    }
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}