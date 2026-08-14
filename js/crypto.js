// js/crypto.js
// WebCrypto helpers: PBKDF2 -> AES-GCM, plus verifier helpers.

export const buf2hex = (buf) => [...new Uint8Array(buf)]
  .map(b => b.toString(16).padStart(2, '0')).join('');

export const hex2buf = (hex) => {
  if (!hex) return new ArrayBuffer(0);
  const u = new Uint8Array(hex.length / 2);
  for (let i = 0; i < u.length; i++) u[i] = parseInt(hex.substr(i*2,2), 16);
  return u.buffer;
};

export const ab2b64 = (ab) => btoa(String.fromCharCode(...new Uint8Array(ab)));
export const b642ab = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

export const randBytes = (len = 12) => crypto.getRandomValues(new Uint8Array(len));

// derive AES-GCM key from password + saltHex
export async function deriveKeyFromPassword(password, saltHex) {
  const pw = new TextEncoder().encode(password);
  const salt = hex2buf(saltHex);
  const baseKey = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveKey']);
  const derived = await crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt,
    iterations: 150000,
    hash: 'SHA-256'
  }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return derived;
}

export async function encryptWithKey(key, arrayBuffer) {
  const iv = randBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  return { iv: buf2hex(iv.buffer), ciphertext: ab2b64(ct) };
}

export async function decryptWithKey(key, ivHex, ciphertextB64) {
  const iv = hex2buf(ivHex);
  const ct = b642ab(ciphertextB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return plain; // ArrayBuffer
}

// Create verifier object for a new master password
// returns { saltHex, verifier: ciphertextB64, iv }
export async function makeVerifier(password) {
  const salt = randBytes(16);
  const saltHex = buf2hex(salt.buffer);
  const key = await deriveKeyFromPassword(password, saltHex);
  const message = new TextEncoder().encode('securevault-verifier-v1');
  const enc = await encryptWithKey(key, message);
  return { saltHex, verifier: enc.ciphertext, iv: enc.iv };
}

// Validate password against stored verifier and return derived key on success.
// stored = { saltHex, verifier, iv }
export async function validatePassword(password, stored) {
  const key = await deriveKeyFromPassword(password, stored.saltHex);
  try {
    const plain = await decryptWithKey(key, stored.iv, stored.verifier); // ArrayBuffer
    const text = new TextDecoder().decode(plain);
    if (text === 'securevault-verifier-v1') return key;
    return null;
  } catch (e) {
    return null;
  }
}
