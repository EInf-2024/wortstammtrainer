document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('id');

    if (assignmentId) {
        loadTrainingWords(assignmentId);
    }

    document.getElementById('checkBtn').addEventListener('click', checkAnswers);
    document.getElementById('nextBtn').addEventListener('click', loadNextWords);
    document.getElementById('backBtn').addEventListener('click', goBack);
});

function loadTrainingWords(assignmentId) {
    const words = [
        { id: 1, base: 'aller', noun: 'le départ', verb: 'aller', adjective: 'tous', adverb: 'partout' },
        { id: 2, base: 'voir', noun: 'la vue', verb: 'voir', adjective: 'visible', adverb: 'visiblement' },
        { id: 3, base: 'parler', noun: 'la parole', verb: 'parler', adjective: 'parlant', adverb: '' },
        { id: 4, base: 'grand', noun: 'la grandeur', verb: '', adjective: 'grand', adverb: 'grandement' }
    ];

    const tbody = document.querySelector('#trainingTable tbody');
    tbody.innerHTML = words.map(word => `
        <tr data-word-id="${word.id}">
            <td class="noun-cell">${word.noun || '<input type="text" class="form-control">'}</td>
            <td class="verb-cell">${word.verb || '<input type="text" class="form-control">'}</td>
            <td class="adjective-cell">${word.adjective || '<input type="text" class="form-control">'}</td>
            <td class="adverb-cell">${word.adverb || '<input type="text" class="form-control">'}</td>
        </tr>
    `).join('');
}

function checkAnswers() {
    const rows = document.querySelectorAll('#trainingTable tbody tr');
    let allCorrect = true;

    rows.forEach(row => {
        const wordId = row.dataset.wordId;
        const cells = row.querySelectorAll('td');
        let rowCorrect = true;

        cells.forEach(cell => {
            const input = cell.querySelector('input');
            if (input) {
                // Simple validation - in real app would check against correct answers
                const isCorrect = input.value.trim() !== '';
                if (!isCorrect) {
                    rowCorrect = false;
                    allCorrect = false;
                    input.classList.add('is-invalid');
                } else {
                    input.classList.add('is-valid');
                }
            }
        });

        if (rowCorrect) {
            row.classList.add('table-success');
        }
    });

    if (allCorrect) {
        alert('Alle Antworten sind korrekt!');
    }

    document.getElementById('checkBtn').disabled = true;
    document.getElementById('nextBtn').disabled = false;
}

function loadNextWords() {
    alert('Nächste Wörter werden geladen...');
    window.location.reload();
}

function goBack() {
    window.location.href = '/student/dashboard.html';
}