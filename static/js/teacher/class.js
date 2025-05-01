document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    setupLogout();

    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');
    if (classId) {
        loadStudents(classId);
    }
});

async function loadClasses() {
    try {
        const response = await fetch('/get_classes');
        if (!response.ok) throw new Error('Klassen konnten nicht geladen werden');
        const classes = await response.json();

        const classList = document.getElementById('classList');
        if (classList) {
            classList.innerHTML = classes.map(cls => `
                <a href="class.html?id=${cls.id}" class="list-group-item list-group-item-action">
                    ${cls.label}
                </a>
            `).join('');

            // Highlight selected class
            const urlParams = new URLSearchParams(window.location.search);
            const selectedId = urlParams.get('id');
            if (selectedId) {
                const selected = classList.querySelector(`[href="class.html?id=${selectedId}"]`);
                if (selected) selected.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Klassen');
    }
}

async function loadStudents(classId) {
    try {
        const response = await fetch(`/get_students?class_id=${classId}`);
        if (!response.ok) throw new Error('Schüler konnten nicht geladen werden');
        const students = await response.json();

        document.getElementById('className').textContent = 'Klasse ' + classId;
        const studentList = document.getElementById('studentList');
        studentList.innerHTML = students.map(student => `
            <div class="list-group-item student-item" data-student-id="${student.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${student.username}</span>
                    <button class="btn btn-sm btn-outline-primary view-progress-btn">Fortschritt anzeigen</button>
                </div>
                <div class="student-progress-container mt-2 d-none" data-student-id="${student.id}">
                    <div class="student-progress-list"></div>
                </div>
            </div>
        `).join('');

        // Add event listeners for progress buttons
        document.querySelectorAll('.view-progress-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const studentItem = this.closest('.student-item');
                const studentId = studentItem.getAttribute('data-student-id');
                const progressContainer = studentItem.querySelector('.student-progress-container');

                // Toggle visibility
                progressContainer.classList.toggle('d-none');

                // Load progress if not already loaded
                if (!progressContainer.hasAttribute('data-loaded')) {
                    try {
                        const progressResponse = await fetch(`/get_student?student_id=${studentId}`);
                        if (!progressResponse.ok) throw new Error('Fortschritt konnte nicht geladen werden');
                        const progress = await progressResponse.json();

                        const progressList = progressContainer.querySelector('.student-progress-list');
                        progressList.innerHTML = Object.entries(progress).map(([wordlistId, progress]) => `
                            <div class="d-flex justify-content-between border-bottom py-2">
                                <span>Wortliste ${wordlistId}:</span>
                                <span>${progress}</span>
                            </div>
                        `).join('');

                        progressContainer.setAttribute('data-loaded', 'true');
                    } catch (error) {
                        console.error('Fehler:', error);
                        alert('Fehler beim Laden des Fortschritts');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Laden der Schüler');
    }
}

function setupLogout() {
    document.querySelector('.logout-btn')?.addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}