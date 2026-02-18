/* ══════════════════════════════════════════════════════════════
   Auth System — Client Side
   ══════════════════════════════════════════════════════════════ */

const Auth = (() => {
    let currentUser = null;

    function init() {
        // UI Elements
        const modal = document.getElementById('auth-modal');
        const openBtn = document.getElementById('open-auth-btn');
        const closeBtn = document.getElementById('close-auth');
        const logoutBtn = document.getElementById('logout-btn');
        const tabs = document.querySelectorAll('.tab-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authMsg = document.getElementById('auth-msg');
        const userDisplay = document.getElementById('user-display');
        const nameInput = document.getElementById('player-name');

        // Check local storage
        const stored = localStorage.getItem('ghost_user');
        if (stored) {
            try {
                currentUser = JSON.parse(stored);
                updateUI(currentUser);
            } catch (e) {
                console.error('Auth Parse Error', e);
            }
        }

        // Open/Close Modal
        openBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            authMsg.textContent = '';
        });
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        // Tabs
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.tab;
                if (mode === 'login') {
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                } else {
                    loginForm.classList.add('hidden');
                    registerForm.classList.remove('hidden');
                }
                authMsg.textContent = '';
            });
        });

        // Login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('ghost_user', JSON.stringify(currentUser));
                    updateUI(currentUser);
                    modal.classList.add('hidden');
                } else {
                    authMsg.textContent = data.error || 'Login failed';
                    authMsg.style.color = 'red';
                }
            } catch (err) {
                authMsg.textContent = 'Network error';
            }
        });

        // Register
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (data.success) {
                    // Login immediately
                    currentUser = { username: data.username, id: data.id };
                    localStorage.setItem('ghost_user', JSON.stringify(currentUser));
                    updateUI(currentUser);
                    modal.classList.add('hidden');
                } else {
                    authMsg.textContent = data.error || 'Registration failed';
                    authMsg.style.color = 'red';
                }
            } catch (err) {
                authMsg.textContent = 'Network error';
            }
        });

        // Logout
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('ghost_user');
            updateUI(null);
        });

        function updateUI(user) {
            if (user) {
                userDisplay.classList.remove('hidden');
                userDisplay.innerHTML = `Welcome, <b>${user.username}</b>`;
                logoutBtn.classList.remove('hidden');
                openBtn.classList.add('hidden');

                // Pre-fill name and lock it
                nameInput.value = user.username;
                nameInput.disabled = true;
                nameInput.title = "Logged in as " + user.username;
            } else {
                userDisplay.classList.add('hidden');
                logoutBtn.classList.add('hidden');
                openBtn.classList.remove('hidden');

                nameInput.value = '';
                nameInput.disabled = false;
                nameInput.title = "Enter Name";
            }
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', Auth.init);
