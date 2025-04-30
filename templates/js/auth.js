document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;


            authenticateUser(email, password);
        });
    }
});

function authenticateUser(email, password) {

    console.log('Authenticating:', email);


    setTimeout(() => {

        window.location.href = email.includes('lehrer') ?
            '/teacher/dashboard.html' : '/student/dashboard.html';
    }, 1000);
}