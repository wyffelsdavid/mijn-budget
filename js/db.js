'use strict';
/* Mijn Budget – lokale database (IndexedDB). Alle gegevens blijven op dit toestel. */
const DB = (() => {
  const NAME = 'mijn-budget-db';
  const VERSION = 1; // Verhoog bij een nieuwe structuur en voeg hieronder een migratie toe.
  const STORES = { transactions: 'id', categories: 'id', budgets: 'categoryId', recurring: 'id', goals: 'id', settings: 'key' };
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('Deze browser ondersteunt geen lokale database (IndexedDB).'));
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const d = req.result;
        const old = e.oldVersion || 0;
        if (old < 1) {
          for (const [store, key] of Object.entries(STORES)) {
            if (d.objectStoreNames.contains(store)) continue;
            const os = d.createObjectStore(store, { keyPath: key });
            if (store === 'transactions') { os.createIndex('date', 'date'); os.createIndex('type', 'type'); }
          }
        }
        // Toekomstige migraties: if (old < 2) { ... }
      };
      req.onsuccess = () => {
        db = req.result;
        db.onversionchange = () => { db.close(); location.reload(); };
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('De database is geblokkeerd. Sluit andere vensters van de app en probeer opnieuw.'));
    });
  }

  function done(t) {
    return new Promise((res, rej) => {
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Opslaan afgebroken'));
    });
  }

  function getAll(store) {
    return new Promise((res, rej) => {
      const r = db.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  }

  /* Eén atomaire bewerking over meerdere tabellen: alles lukt, of niets. */
  function batch(ops) {
    const names = new Set([...(ops.clear || []), ...Object.keys(ops.put || {}), ...Object.keys(ops.del || {})]);
    if (!names.size) return Promise.resolve();
    const t = db.transaction([...names], 'readwrite');
    for (const s of ops.clear || []) t.objectStore(s).clear();
    for (const [s, arr] of Object.entries(ops.put || {})) for (const o of arr) t.objectStore(s).put(o);
    for (const [s, arr] of Object.entries(ops.del || {})) for (const k of arr) t.objectStore(s).delete(k);
    return done(t);
  }

  const put = (s, o) => batch({ put: { [s]: [o] } });
  const del = (s, k) => batch({ del: { [s]: [k] } });

  return { open, getAll, batch, put, del, STORES: Object.keys(STORES), VERSION };
})();
