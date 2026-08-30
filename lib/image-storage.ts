const DB_NAME = 'veda-ai-storage';
const DB_VERSION = 1;
const STORE_NAME = 'answer-sheets';

interface StoredAnswerImages {
  key: string;
  images: string[];
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

export async function saveAnswerImages(
  key: string,
  images: string[]
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const data: StoredAnswerImages = {
      key,
      images,
      createdAt: Date.now(),
    };

    store.put(data);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error('Failed to save answer-sheet images.')
      );
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
          new Error('Answer-sheet image storage transaction was aborted.')
      );
    };
  });
}

export async function getAnswerImages(
  key: string
): Promise<string[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(key);

    request.onsuccess = () => {
      db.close();

      const result = request.result as StoredAnswerImages | undefined;

      if (!result || !Array.isArray(result.images)) {
        resolve([]);
        return;
      }

      resolve(result.images);
    };

    request.onerror = () => {
      db.close();
      reject(
        request.error ||
          new Error('Failed to load answer-sheet images.')
      );
    };
  });
}

export async function deleteAnswerImages(
  key: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(
        transaction.error ||
          new Error('Failed to delete answer-sheet images.')
      );
    };
  });
}