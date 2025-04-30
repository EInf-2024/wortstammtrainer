document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');

    if (classId) {
        loadClassData(classId);
    }
    setupBackButton();
});

async function loadClassData(classId) {
    try {
        // Fetch class details
        const classData = await fetch(`/get_classes?id=${classId}`)
            .then(res => res.json());

        // Fetch students in class
        const students = await fetch(`/get_students?class_id=${classId}`)
            .then(res => res.json());

        document.getElementById('className').textContent = `Klasse ${classData.label}`;
        renderStudents(students);

    } catch (error) {
        console.error('Failed to load class data:', error);
        window.location.href = '/teacher/dashboard.html';
    }
}

function renderStudents(students) {
    const container = document.getElementById('studentList');
    container.innerHTML = students.map(student => `
        <div class="student-card list-group-item">
            <div class="student-header d-flex justify-content-between align-items-center"
                 data-id="${student.id}">
                <span>${student.username}</span>
                <i class="bi bi-chevron-down"></i>
            </div>
            <div class="student-progress collapse">
                <!-- Progress will be loaded here -->
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.student-header').forEach(header => {
        header.addEventListener('click', async function() {
            const studentId = this.dataset.id;
            const progressDiv = this.nextElementSibling;

            // Toggle collapse
            const bsCollapse = new bootstrap.Collapse(progressDiv, {
                toggle: true
            });

            // Load progress if not already loaded
            if (!progressDiv.hasAttribute('data-loaded')) {
                try {
                    const progress = await fetch(`/get_student?student_id=${studentId}`)
                        .then(res => res.json());

                    progressDiv.innerHTML = Object.entries(progress).map(([wordlist, score]) => `
                        <div class="d-flex justify-content-between align-items-center p-2">
                            <span>${wordlist}</span>
                            <span>${score}</span>
                        </div>
                    `).join('');

                    progressDiv.setAttribute('data-loaded', 'true');
                } catch (error) {
                    progressDiv.innerHTML = `<div class="text-danger p-2">Fehler beim Laden</div>`;
                }
            }
        });
    });
}

function setupBackButton() {
    document.getElementById('backBtn').addEventListener('click', function() {
        window.location.href = '/teacher/dashboard.html';
    });
}