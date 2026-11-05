// Media blobs live in IndexedDB (only where the browser allows it).
export type Attachment = { id: string; kind: 'image' | 'video' | 'audio'; name?: string };
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const rq = indexedDB.open('hiral-notes-media', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('media', { keyPath: 'id' });
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return dbp;
}
export const mediaStore = {
  async put(id: string, blob: Blob) {
    const d = await db();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction('media', 'readwrite');
      tx.objectStore('media').put({ id, blob });
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  },
  async get(id: string): Promise<Blob | null> {
    const d = await db();
    return new Promise((res, rej) => {
      const rq = d.transaction('media').objectStore('media').get(id);
      rq.onsuccess = () => res(rq.result?.blob ?? null);
      rq.onerror = () => rej(rq.error);
    });
  },
  async del(id: string) {
    const d = await db();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction('media', 'readwrite');
      tx.objectStore('media').delete(id);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  },
};

// True only where IndexedDB actually works (hosted-File sandbox blocks it).
export async function mediaSupported(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    await mediaStore.put('__probe__', new Blob(['x']));
    await mediaStore.del('__probe__');
    return true;
  } catch { return false; }
}
