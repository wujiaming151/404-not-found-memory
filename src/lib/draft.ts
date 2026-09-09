const key = 'memory-draft';
/** Large high-resolution submissions belong in IndexedDB, not 5 MB sessionStorage. */
export async function writePending(id: string, raw: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(raw, `pending-${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function readPending(id: string): Promise<string | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction('drafts')
        .objectStore('drafts')
        .get(`pending-${id}`);
      request.onsuccess = () =>
        resolve(
          request.result ||
            sessionStorage.getItem(`pending-${id}`) ||
            undefined,
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function removePending(id: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').delete(`pending-${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    sessionStorage.removeItem(`pending-${id}`);
  } finally {
    db.close();
  }
}
export function saveDraftTitle(title: string) {
  try {
    localStorage.setItem('memory-draft-title', title);
  } catch {
    /* IndexedDB remains the primary store. */
  }
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('memory-studio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('drafts');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveDraft(value: {
  image: string;
  title: string;
  history: string[];
  index: number;
  demo?: boolean;
}) {
  saveDraftTitle(value.title);
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function loadDraft(): Promise<
  | {
      image: string;
      title: string;
      history: string[];
      index: number;
      demo?: boolean;
    }
  | undefined
> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction('drafts').objectStore('drafts').get(key);
    r.onsuccess = () => {
      const draft = r.result;
      if (draft) {
        try {
          draft.title =
            localStorage.getItem('memory-draft-title') ?? draft.title;
        } catch {}
      }
      resolve(draft);
      db.close();
    };
    r.onerror = () => reject(r.error);
  });
}
export async function clearDraft() {
  try {
    localStorage.removeItem('memory-draft-title');
  } catch {}
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
