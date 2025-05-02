document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // Accept both 'wordlist_ids' (comma-separated) and 'id' (single)
    let wordlistIds = urlParams.get('wordlist_ids');
    if (!wordlistIds) {
        const singleId = urlParams.get('id');
        if (singleId) {
            wordlistIds = singleId;
        }
    }

    if (!wordlistIds) {
        window.location.href = '/student';
        return;
    }

    // If multiple IDs, it's personal pool, else Einzeltraining
    const personalPool = wordlistIds.includes(',') ? 1 : 0;
    loadWords(wordlistIds, personalPool);
    setupButtons();
    setupLogout();
});

async function loadWords(wordlistIds, personalPool) {
    try {
        const response = await fetch('/create_exercise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordlist_ids: wordlistIds.split(','),
                personal_pool: personalPool
            })
        });

        if (!response.ok) {
            let msg = 'Fehler beim Laden der Wörter';
            try {
                const err = await response.json();
                msg = err.message || msg;
            } catch {}
            alert(msg);
            window.location.href = '/student';
            return;
        }

        const words = await response.json();
        renderWordTable(words);
    } catch (error) {
        console.error('Error loading words:', error);
        alert('Fehler beim Laden der Wörter');
        window.location.href = '/student';
    }
}

function renderWordTable(words) {
    const tableBody = document.getElementById('wordTableBody');
    tableBody.innerHTML = '';

    words.forEach((word, index) => {
        const row = document.createElement('tr');

        // Create cells for each word type
        for (let i = 0; i < 4; i++) {
            const cell = document.createElement('td');

            if (word.wortart === i) {
                // This is the given word
                cell.textContent = word.wort;
                cell.classList.add('given');
                cell.dataset.wordId = word.word_id;
            } else {
                // This is an input field for student to fill
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.dataset.wordId = word.word_id;
                input.dataset.wordType = i;
                cell.appendChild(input);
            }

            row.appendChild(cell);
        }

        tableBody.appendChild(row);
    });
}

function setupButtons() {
    const checkBtn = document.getElementById('checkAnswers');
    const nextBtn = document.getElementById('nextWords');
    nextBtn.disabled = true; // Disable initially

    checkBtn.addEventListener('click', async function() {
        const inputs = document.querySelectorAll('#wordTableBody input[type="text"]');
        const answers = {};

        inputs.forEach((input, index) => {
            const wordId = input.dataset.wordId;
            const wordType = input.dataset.wordType;

            answers[`word_${index}`] = {
                word_id: wordId,
                nomen: wordType === '0' ? input.value : '',
                verb: wordType === '1' ? input.value : '',
                adjektiv: wordType === '2' ? input.value : '',
                adverb: wordType === '3' ? input.value : ''
            };
        });

        try {
            const response = await fetch('/correct_exercise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(answers)
            });

            if (!response.ok) throw new Error('Failed to check answers');

            const results = await response.json();
            highlightResults(results);
            nextBtn.disabled = false; // Enable after checking
            checkBtn.disabled = true; // Prevent double-checking
        } catch (error) {
            console.error('Error checking answers:', error);
            alert('Fehler beim Korrigieren der Antworten');
        }
    });

    nextBtn.addEventListener('click', function() {
        location.reload(); // Reload to get new random words
    });
}

function highlightResults(results) {
    results.forEach(result => {
        const inputs = document.querySelectorAll(`input[data-word-id="${result.word_id}"]`);
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add(result.correct ? 'is-valid' : 'is-invalid');
        });
    });
}

function setupLogout() {
    document.querySelector('.logout-btn').addEventListener('click', function() {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    });
}
