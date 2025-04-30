async function loadTeacherDashboard() {
    // Fetch all classes
    const classes = await fetch('/get_classes')
        .then(res => res.json());

    // Fetch all wordlists (assignments)
    const assignments = await fetch('/get_wordlists')
        .then(res => res.json());

    // Update UI
    document.getElementById('classCount').textContent = classes.length;
    document.getElementById('assignmentCount').textContent = assignments.length;
    document.getElementById('studentCount').textContent = classes.reduce((sum, cls) => sum + cls.students, 0);

    // Render classes
    const classList = document.getElementById('classList');
    classList.innerHTML = classes.map(cls => `
        <a href="/teacher/class.html?id=${cls.id}" class="list-group-item list-group-item-action">
            ${cls.label} (${cls.student_count || 0} Schüler)
        </a>
    `).join('');
}