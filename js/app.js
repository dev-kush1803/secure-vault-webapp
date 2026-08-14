// js/app.js
// Local-only sign-in/sign-up with salted SHA-256 hashing (no backend).

// --- DOM elements ---
const btnLogin  = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const signinPane = document.getElementById('signin-pane');
const signupPane = document.getElementById('signup-pane');

// toggle panes
document.getElementById('goto-signup')?.addEventListener('click', e => {
  e.preventDefault();
  signinPane.classList.add('hidden');
  signupPane.classList.remove('hidden');
});
document.getElementById('goto-signin')?.addEventListener('click', e => {
  e.preventDefault();
  signupPane.classList.add('hidden');
  signinPane.classList.remove('hidden');
});

// --- simple password hashing helper ---
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- signup logic ---
if (btnSignup) {
  btnSignup.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const pass = document.getElementById('signup-pass').value;
    const pass2 = document.getElementById('signup-pass2').value;
    if (!email || !pass) return alert('Enter all fields.');
    if (pass !== pass2) return alert('Passwords do not match.');
    const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
    if (users[email]) return alert('User already exists.');
    const salt = crypto.getRandomValues(new Uint8Array(16)).join('');
    const hash = await hashPassword(pass, salt);
    users[email] = { salt, hash, createdAt: Date.now() };
    localStorage.setItem('sv_users', JSON.stringify(users));
    alert('Account created successfully! Please sign in.');
    signupPane.classList.add('hidden');
    signinPane.classList.remove('hidden');
  });
}

// --- login logic ---
if (btnLogin) {
  btnLogin.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;
    const users = JSON.parse(localStorage.getItem('sv_users') || '{}');
    const user = users[email];
    if (!user) return alert('No account found. Please sign up.');
    const hash = await hashPassword(pass, user.salt);
    if (hash !== user.hash) return alert('Incorrect password.');
    // success
    localStorage.setItem('vaultUser', email);
    location.href = 'dashboard.html';
  });
}

// --- session guard for other pages ---
const currentPage = location.pathname.split('/').pop();
if (!['index.html', ''].includes(currentPage)) {
  const user = localStorage.getItem('vaultUser');
  if (!user) location.href = 'index.html';
}
