document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            authenticateUser(username, password);
        });
    }


    checkAuthStatus();
});

function authenticateUser(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Login fehlgeschlagen');
        }
        return response.json();
    })
    .then(data => {

        document.cookie = `auth=${data.access_token}; path=/`;


        if (data.role === 'teacher') {
            window.location.href = '/teacher/teacher.html';
        } else if (data.role === 'student') {
            window.location.href = '/student/teacher.html';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.');
    });
}

function checkAuthStatus() {

    if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
        return;
    }


    const authCookie = document.cookie.split('; ')
        .find(row => row.startsWith('auth='));

    if (!authCookie) {
        window.location.href = '/index.html';
        return;
    }


    verifyToken(authCookie.split('=')[1]);
}

function verifyToken(token) {
    fetch('/verify_token', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return response.json();
    })
    .then(data => {

    })
    .catch(error => {
        console.error('Token verification failed:', error);
        window.location.href = '/index.html';
    });
}

function logout() {

    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/index.html';
}


document.addEventListener('click', function(e) {
    if (e.target.classList.contains('logout-btn') ||
        (e.target.parentElement && e.target.parentElement.classList.contains('logout-btn'))) {
        e.preventDefault();
        logout();
    }
});