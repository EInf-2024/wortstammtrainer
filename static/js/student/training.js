let currentWordlistId = null;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentWordlistId = urlParams.get('id') || urlParams.get('wordlist_ids');

    loadExercise(currentWordlistId ? [currentWordlistId] : getSelectedWordlists());
});

function getSelectedWordlists() {
    return Array.from(document.querySelectorAll('.assignment-check:checked'))
        .map(el => el.value);
}

async function loadExercise(wordlistIds) {
    const response = await fetch('/create_exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            wordlist_ids: wordlistIds,
            personal_pool: wordlistIds.length > 1 ? 1 : 0
        })
    });

    currentWords = await response.json();
    renderWords(currentWords);
}

function renderWords(words) {
    const tbody = document.querySelector('.training-table tbody');
    tbody.innerHTML = words.map(word => `
        <tr data-id="${word.word_id}">
            <td class="${word.wortart === 0 ? 'given' : ''}">
                ${word.wortart === 0 ? word.wort : '<input type="text">'}
            </td>
            <td class="${word.wortart === 1 ? 'given' : ''}">
                ${word.wortart === 1 ? word.wort : '<input type="text">'}
            </td>
            <td class="${word.wortart === 2 ? 'given' : ''}">
                ${word.wortart === 2 ? word.wort : '<input type="text">'}
            </td>
            <td class="${word.wortart === 3 ? 'given' : ''}">
                ${word.wortart === 3 ? word.wort : '<input type="text">'}
            </td>
        </tr>
    `).join('');
}

async function checkAnswers() {
    const answers = prepareAnswers(); // Format as per app.py requirements
    const response = await fetch('/correct_exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers)
    });

    const results = await response.json();
    highlightResults(results);
    document.getElementById('nextBtn').disabled = false;
}

function goBack() {
    window.location.href = '/student/dashboard.html';
}