document.addEventListener('DOMContentLoaded', function() {
    loadClassStudents();
    setupLogout();
});

async function loadClassStudents() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');

        if (!classId) {
            console.error('No class ID in URL');
            return;
        }

        const response = await fetch(`/get_students?class_id=${classId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load students');
        }
        const students = await response.json();

        document.getElementById('className').textContent = `Klasse ${classId}`;
        const studentList = document.getElementById('studentList');

        if (students.length === 0) {
            studentList.innerHTML = '<div class="list-group-item">Keine Schüler in dieser Klasse</div>';
            return;
        }

        studentList.innerHTML = students.map(student => `
            <div class="list-group-item student-item" data-student-id="${student.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${student.username}</span>
                    <button class="btn btn-sm btn-outline-primary view-progress-btn" 
                            data-student-id="${student.id}">
                        Fortschritt anzeigen
                    </button>
                </div>
                <div class="student-progress-container mt-2 d-none" 
                     data-student-id="${student.id}">
                    <div class="student-progress-list"></div>
                </div>
            </div>
        `).join('');

        // Add event listeners for progress buttons
        document.querySelectorAll('.view-progress-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const studentId = this.dataset.studentId;
                const progressContainer = document.querySelector(
                    `.student-progress-container[data-student-id="${studentId}"]`
                );

                // Toggle visibility
                progressContainer.classList.toggle('d-none');

                // Load progress if not already loaded
                if (!progressContainer.hasAttribute('data-loaded')) {
                    try {
                        const response = await fetch(`/get_student?id=${studentId}`);
                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Failed to load progress');
                        }
                        const progress = await response.json();

                        const progressList = progressContainer.querySelector('.student-progress-list');
                        progressList.innerHTML = Object.entries(progress).map(([wordlistId, progress]) => `
                            <div class="d-flex justify-content-between border-bottom py-2">
                                <span>Wortliste ${wordlistId}:</span>
                                <span>${progress}</span>
                            </div>
                        `).join('');

                        progressContainer.setAttribute('data-loaded', 'true');
                    } catch (error) {
                        console.error('Error loading progress:', error);
                        progressContainer.querySelector('.student-progress-list').innerHTML = `
                            <div class="alert alert-danger">Fortschritt konnte nicht geladen werden</div>
                        `;
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading class students:', error);
        alert('Fehler beim Laden der Schüler: ' + error.message);
    }
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}