// js/db.js
// Minimal IndexedDB wrapper for vault entries + recycle bin

const DB_NAME = 'secure_vault_db';
const DB_VERSION = 1;
const ENTRIES = 'vault_entries';
const RECYCLE = 'recycle_bin';

function openDB() {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(ENTRIES)) {
        db.createObjectStore(ENTRIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RECYCLE)) {
        db.createObjectStore(RECYCLE, { keyPath: 'id' });
      }
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

export async function put(store, obj) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite').objectStore(store).put(obj);
    tx.onsuccess = () => res(tx.result);
    tx.onerror = () => rej(tx.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly').objectStore(store).getAll();
    tx.onsuccess = () => res(tx.result);
    tx.onerror = () => rej(tx.error);
  });
}

export async function getOne(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly').objectStore(store).get(key);
    tx.onsuccess = () => res(tx.result);
    tx.onerror = () => rej(tx.error);
  });
}

export async function del(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    tx.onsuccess = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export { ENTRIES, RECYCLE };
