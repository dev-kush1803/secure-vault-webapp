// js/password-vault.js
// Uses crypto.js and db.js to implement encrypted password storage.
// Workflow:
// - On load: check localStorage 'vault_account' — if missing, ask user to create master password.
// - If exists and not unlocked, show Unlock flow.
// - After unlock, derivedKey is stored in-memory (JS variable) for session.
// - Entries are stored encrypted in IndexedDB (vault_entries).
// - Provide add/reveal/copy/delete, export/import, change master password.

import { makeVerifier, validatePassword, deriveKeyFromPassword, encryptWithKey, decryptWithKey, buf2hex } from './crypto.js';
import { put, getAll, del, ENTRIES } from './db.js';

const MODAL = document.getElementById('modal');
const MODAL_TITLE = document.getElementById('modal-title');
const MODAL_BODY = document.getElementById('modal-body');
const MODAL_OK = document.getElementById('modal-ok');
const MODAL_CANCEL = document.getElementById('modal-cancel');

let derivedKey = null;     // CryptoKey for session
let currentUser = null;    // stored user (email) - optional
let accountMeta = null;    // { username?, saltHex, verifier, iv } stored in localStorage

function saveAccount(obj) {
  localStorage.setItem('vault_account', JSON.stringify(obj));
}
function loadAccount() {
  return JSON.parse(localStorage.getItem('vault_account') || 'null');
}
function showModal(title, bodyHTML, okText='OK') {
  MODAL_TITLE.textContent = title;
  MODAL_BODY.innerHTML = bodyHTML;
  MODAL_OK.textContent = okText;
  MODAL.classList.remove('hidden');
}
function closeModal() {
  MODAL.classList.add('hidden');
}

MODAL_CANCEL.addEventListener('click', ()=>{ closeModal(); });
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

// ---------- bootstrap ----------
(async function init() {
  accountMeta = loadAccount();
  if(!accountMeta) {
    // create vault flow
    showCreateVault();
  } else {
    // prompt unlock if not unlocked
    await showUnlock();
  }

  // wire UI actions
  document.getElementById('btn-add').addEventListener('click', onAddNew);
  document.getElementById('pv-search').addEventListener('input', onSearch);
  document.getElementById('btn-export').addEventListener('click', onExport);
  document.getElementById('btn-import').addEventListener('click', ()=>document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', onImportFile);
  document.getElementById('btn-change-pass').addEventListener('click', onChangePassword);

  // initial list
  if(derivedKey) await loadEntries();
})();

// ---------- create vault ----------
function showCreateVault() {
  const html = `
    <p>Create a master password for your Password Vault. This password is <strong>never</strong> sent anywhere.</p>
    <label class="input-label">Master password</label>
    <input id="cw-pass" type="password" placeholder="Create master password">
    <label class="input-label">Confirm</label>
    <input id="cw-pass2" type="password" placeholder="Confirm password">
  `;
  showModal('Create Vault', html, 'Create');
  MODAL_OK.onclick = async () => {
    const pass = document.getElementById('cw-pass').value || '';
    const pass2 = document.getElementById('cw-pass2').value || '';
    if(!pass) return alert('Enter a master password.');
    if(pass !== pass2) return alert('Passwords do not match.');
    const v = await makeVerifier(pass);
    // store account meta (no plaintext password)
    const obj = { saltHex: v.saltHex, verifier: v.verifier, iv: v.iv, createdAt: Date.now() };
    saveAccount(obj);
    accountMeta = obj;
    derivedKey = await validatePassword(pass, accountMeta); // returns key
    closeModal();
    await loadEntries();
    alert('Vault created locally. Remember your master password.');
  };
}

// ---------- unlock ----------
async function showUnlock() {
  // ask for master password
  const html = `
    <p>Enter your master password to unlock the vault.</p>
    <input id="unlock-pass" type="password" placeholder="Master password">
  `;
  showModal('Unlock Vault', html, 'Unlock');
  MODAL_OK.onclick = async () => {
    const pass = document.getElementById('unlock-pass').value || '';
    if(!pass) return alert('Enter password.');
    const acct = loadAccount();
    if(!acct) { closeModal(); return showCreateVault(); }
    const key = await validatePassword(pass, acct);
    if(!key) return alert('Incorrect password.');
    derivedKey = key;
    accountMeta = acct;
    closeModal();
    await loadEntries();
  };
}

// ---------- entries ----------
async function onAddNew() {
  if(!derivedKey) return alert('Unlock vault first.');
  const html = `
    <label class="input-label">Website / Title</label>
    <input id="ent-site" placeholder="example.com">
    <label class="input-label">Username / Email</label>
    <input id="ent-user" placeholder="user@example.com">
    <label class="input-label">Password</label>
    <input id="ent-pass" placeholder="Enter password or leave blank to auto-generate">
    <div style="margin-top:8px;font-size:13px" class="muted">You can paste or type a password; it will be encrypted on save.</div>
  `;
  showModal('Add New Credential', html, 'Save');
  MODAL_OK.onclick = async () => {
    const site = document.getElementById('ent-site').value.trim();
    const user = document.getElementById('ent-user').value.trim();
    let pass = document.getElementById('ent-pass').value;
    if(!site || !user) return alert('Site and username required.');
    if(!pass) {
      // simple random password
      pass = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => ('0'+(b%94+33).toString(16)).slice(-2)).join('').slice(0,16);
    }
    // encrypt password value (text) using derivedKey
    const enc = await encryptWithKey(derivedKey, new TextEncoder().encode(pass));
    const id = crypto.randomUUID();
    const obj = { id, site, username: user, iv: enc.iv, ciphertext: enc.ciphertext, ts: Date.now() };
    await put(ENTRIES, obj);
    closeModal();
    await loadEntries();
  };
}

// render entries
async function loadEntries(filter='') {
  const rows = document.querySelector('#entries-table tbody');
  rows.innerHTML = '<tr><td colspan="5" class="muted">Loading…</td></tr>';
  const items = await getAll(ENTRIES);
  const list = items.filter(it => {
    const q = filter.toLowerCase();
    return !q || (it.site && it.site.toLowerCase().includes(q)) || (it.username && it.username.toLowerCase().includes(q));
  }).sort((a,b)=>b.ts - a.ts);
  if(!list.length) { rows.innerHTML = '<tr><td colspan="5" class="muted">No credentials stored.</td></tr>'; return; }
  rows.innerHTML = '';
  for (const it of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(it.site)}</td>
      <td>${escapeHtml(it.username)}</td>
      <td class="pw-cell">••••••••</td>
      <td><div class="bar" style="width:50%;height:8px;border-radius:8px;background:linear-gradient(90deg,#4aa3ff,#3b3b3b)"></div></td>
      <td class="actions"><button class="btn ghost btn-reveal" data-id="${it.id}">Reveal</button> <button class="btn ghost btn-copy" data-id="${it.id}">Copy</button> <button class="btn ghost btn-delete" data-id="${it.id}">Delete</button></td>
    `;
    rows.appendChild(tr);
  }

  // wire reveal/copy/delete
  document.querySelectorAll('.btn-reveal').forEach(b => b.addEventListener('click', async (e) => {
    const id = bDataset(e.target, 'id');
    const rec = list.find(x=>x.id===id);
    if(!rec) return;
    try {
      const ab = await decryptWithKey(derivedKey, rec.iv, rec.ciphertext);
      const text = new TextDecoder().decode(ab);
      // toggle reveal inline
      const cell = e.target.closest('tr').querySelector('.pw-cell');
      if (cell.dataset.revealed === '1') {
        cell.textContent = '••••••••';
        cell.dataset.revealed = '0';
        e.target.textContent = 'Reveal';
      } else {
        cell.textContent = text;
        cell.dataset.revealed = '1';
        e.target.textContent = 'Hide';
      }
    } catch (err) {
      console.error(err);
      alert('Failed to decrypt (wrong key or corrupted).');
    }
  }));

  document.querySelectorAll('.btn-copy').forEach(b => b.addEventListener('click', async (e) => {
    const id = bDataset(e.target, 'id');
    const rec = list.find(x=>x.id===id);
    try {
      const ab = await decryptWithKey(derivedKey, rec.iv, rec.ciphertext);
      const text = new TextDecoder().decode(ab);
      await navigator.clipboard.writeText(text);
      alert('Password copied to clipboard.');
    } catch (err) {
      console.error(err);
      alert('Failed to copy password.');
    }
  }));

  document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async (e) => {
    const id = bDataset(e.target, 'id');
    if(!confirm('Delete this credential?')) return;
    await del(ENTRIES, id);
    await loadEntries(filter);
  }));
}

// ---------- search helper ----------
function onSearch(e) {
  loadEntries(e.target.value || '');
}

// ---------- export / import ----------
async function onExport() {
  // export accountMeta + all encrypted entries
  const acct = loadAccount();
  if(!acct) return alert('No vault account found.');
  const items = await getAll(ENTRIES);
  const payload = { account: acct, entries: items, exportedAt: Date.now() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `securevault_export_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function onImportFile(e) {
  const f = e.target.files?.[0];
  if(!f) return;
  try {
    const txt = await f.text();
    const obj = JSON.parse(txt);
    if(!obj.account || !obj.entries) return alert('Invalid import file.');
    // merge entries directly (they are already encrypted)
    for (const it of obj.entries) {
      // ensure unique id - if same id exists, create new id
      const existing = await getAll(ENTRIES).then(arr => arr.find(x => x.id === it.id));
      if (existing) it.id = crypto.randomUUID();
      await put(ENTRIES, it);
    }
    alert('Imported entries (encrypted).');
    await loadEntries();
  } catch (err) {
    console.error(err);
    alert('Failed to import file.');
  } finally {
    e.target.value = '';
  }
}

// ---------- change master password ----------
async function onChangePassword() {
  if(!derivedKey) return alert('Unlock vault first.');
  const html = `
    <label class="input-label">Current master password</label>
    <input id="chg-cur" type="password" placeholder="Current master password">
    <label class="input-label">New master password</label>
    <input id="chg-new" type="password" placeholder="New master password">
    <label class="input-label">Confirm new</label>
    <input id="chg-new2" type="password" placeholder="Confirm new password">
  `;
  showModal('Change Master Password', html, 'Change');
  MODAL_OK.onclick = async () => {
    const cur = document.getElementById('chg-cur').value || '';
    const n1 = document.getElementById('chg-new').value || '';
    const n2 = document.getElementById('chg-new2').value || '';
    if(!cur || !n1) return alert('Fill fields.');
    if(n1 !== n2) return alert('New passwords do not match.');
    const acct = loadAccount();
    const validKey = await validatePassword(cur, acct);
    if(!validKey) return alert('Current password incorrect.');
    // derive new verifier
    const newVer = await makeVerifier(n1);
    // now re-encrypt all entries: decrypt with validKey, encrypt with newKey
    const newDerived = await deriveKeyFromPassword(n1, newVer.saltHex);
    const items = await getAll(ENTRIES);
    for (const it of items) {
      try {
        const plain = await decryptWithKey(validKey, it.iv, it.ciphertext); // ArrayBuffer
        const reEnc = await encryptWithKey(newDerived, plain);
        it.iv = reEnc.iv;
        it.ciphertext = reEnc.ciphertext;
        await put(ENTRIES, it);
      } catch (err) {
        console.error('Skipping item during re-encrypt', it.id, err);
      }
    }
    // save new account metadata
    const saveObj = { saltHex: newVer.saltHex, verifier: newVer.verifier, iv: newVer.iv, updatedAt: Date.now() };
    saveAccount(saveObj);
    // switch in-memory key to newDerived
    derivedKey = newDerived;
    accountMeta = saveObj;
    closeModal();
    alert('Master password changed and entries re-encrypted.');
  };
}

// ---------- small helpers ----------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function bDataset(target, name) {
  // find element with dataset (walk up)
  let el = target;
  while(el && !el.dataset[name]) el = el.parentElement;
  return el?.dataset[name] || target.getAttribute('data-' + name);
}
