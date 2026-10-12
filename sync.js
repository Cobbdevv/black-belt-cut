/* Black Belt Cut — one login (email + password) and sync through Firebase Auth + Firestore.
   With no settings in firebase-config.js the app keeps everything on this device instead. */
'use strict';

const FB_VERSION = '10.12.2';
const FB = { auth: null, db: null, m: null };

function syncConfigured() {
  const c = window.FIREBASE_CONFIG;
  return !!(c && c.apiKey && c.projectId);
}
async function fbLoad() {
  const base = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
  const [a, au, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = a.initializeApp(window.FIREBASE_CONFIG);
  let db;
  try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
  catch (e) { db = fs.getFirestore(app); }
  Object.assign(FB, { auth: au.getAuth(app), db, m: { au, fs } });
}
// Same shape app.js uses for storage: doc('log/<key>').set(body) and .onSnapshot(next, error).
// Each person's data lives under users/<their uid>/log/<key>; the Firestore rules keep it private to them.
function firestoreStore(uid) {
  const fs = FB.m.fs;
  const mapErr = (e) => ({
    code: e && e.code === 'permission-denied' ? 'invalid_argument' : e && e.code === 'resource-exhausted' ? 'quota_exceeded' : 'unavailable',
    message: (e && e.message) || '',
  });
  return {
    doc(path) {
      const ref = fs.doc(FB.db, 'users', uid, ...path.split('/'));
      return {
        set: (body) => fs.setDoc(ref, body).catch((e) => { throw mapErr(e); }),
        onSnapshot: (next, error) => fs.onSnapshot(ref, (s) => next({ exists: s.exists(), data: () => s.data() }), (e) => { if (error) error(mapErr(e)); }),
      };
    },
  };
}
function onAuth(cb) { return FB.m.au.onAuthStateChanged(FB.auth, cb); }

const AUTH_ERRORS = {
  'auth/invalid-credential': 'That email and password don\'t match. Check both and try again.',
  'auth/wrong-password': 'That email and password don\'t match. Check both and try again.',
  'auth/user-not-found': 'There is no account with that email yet. Tap "Create account" instead.',
  'auth/invalid-email': 'That doesn\'t look like an email address.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed': 'No internet connection. Connect and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/operation-not-allowed': 'Email sign-in is switched off in Firebase. Turn it on (README, step 2).',
};
const authMessage = (e) => AUTH_ERRORS[e && e.code] || 'Something went wrong. Try again in a moment.';

// ---------- Login screen ----------
function viewLogin() {
  const create = S.ui.loginMode === 'create';
  return '<form class="view" data-form="login" style="padding-top:0">' +
    '<div class="card accent"><div class="eyebrow">' + (create ? 'New account' : 'Welcome back') + '</div>' +
    '<h2 class="section-title">' + (create ? 'Create your account' : 'Sign in') + '</h2>' +
    '<p class="small">One account for every device. Your log syncs to your phone and every computer you sign in on.</p></div>' +
    '<div class="card"><div class="field"><label for="li-email">Email</label><input class="input" id="li-email" type="email" autocomplete="email" required></div>' +
    '<div class="field"><label for="li-pass">Password</label><input class="input" id="li-pass" type="password" autocomplete="' + (create ? 'new-password' : 'current-password') + '" minlength="6" required></div>' +
    (S.ui.loginError ? '<p class="small" style="color:var(--danger)" role="alert">' + esc(S.ui.loginError) + '</p>' : '') +
    '<button class="btn block" type="submit"' + (S.ui.loginBusy ? ' disabled' : '') + '>' + (S.ui.loginBusy ? 'One moment…' : create ? 'Create account' : 'Sign in') + '</button>' +
    '<div class="row" style="justify-content:space-between"><button class="linkish" type="button" data-act="login-mode">' + (create ? 'I already have an account' : 'Create account') + '</button>' +
    (create ? '' : '<button class="linkish" type="button" data-act="forgot">Forgot password?</button>') + '</div></div></form>';
}
FORMS.login = async (f) => {
  const email = f.querySelector('#li-email').value.trim(), pass = f.querySelector('#li-pass').value;
  S.ui.loginBusy = true; S.ui.loginError = '';
  f.querySelector('button[type="submit"]').disabled = true;
  try {
    if (S.ui.loginMode === 'create') await FB.m.au.createUserWithEmailAndPassword(FB.auth, email, pass);
    else await FB.m.au.signInWithEmailAndPassword(FB.auth, email, pass);
    S.ui.loginBusy = false; // onAuth takes it from here
  } catch (e) {
    S.ui.loginBusy = false; S.ui.loginError = authMessage(e);
    render();
    const i = document.getElementById('li-email'); if (i) i.value = email;
  }
};
ACTIONS['login-mode'] = () => { S.ui.loginMode = S.ui.loginMode === 'create' ? 'signin' : 'create'; S.ui.loginError = ''; render(); };
ACTIONS.forgot = async () => {
  const i = document.getElementById('li-email');
  const email = i ? i.value.trim() : '';
  if (!email) { S.ui.loginError = 'Type your email above first, then tap "Forgot password?" again.'; render(); return; }
  try { await FB.m.au.sendPasswordResetEmail(FB.auth, email); toast('Reset link sent. Check your inbox.'); }
  catch (e) { S.ui.loginError = authMessage(e); render(); const j = document.getElementById('li-email'); if (j) j.value = email; }
};
ACTIONS['sign-out'] = async () => {
  if (!S.ui.confirmSignOut) {
    S.ui.confirmSignOut = true; render();
    setTimeout(() => { if (S.ui.confirmSignOut) { S.ui.confirmSignOut = false; scheduleRender(); } }, 4000);
    return;
  }
  S.ui.confirmSignOut = false;
  try { await FB.m.au.signOut(FB.auth); } catch (e) { toast('Could not sign out. Try again.'); }
};
