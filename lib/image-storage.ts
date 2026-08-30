const DB_NAME = 'veda-ai-storage';
const DB_VERSION = 2;
const STORE_NAME = 'answer-sheets';

interface StoredAnswerImages {
  key: string;
  images: string[];
  createdAt: number;
}

/**
 * Open IndexedDB.
 *
 * This module is client-only in practice. The functions below
 * explicitly reject when called outside the browser.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      typeof indexedDB === 'undefined'
    ) {
      reject(
        new Error(
          'IndexedDB is not available in this browser.'
        )
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        db.createObjectStore(
          STORE_NAME,
          {
            keyPath: 'key',
          }
        );
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      /**
       * If another tab closes/deletes the DB,
       * avoid leaving a broken connection around.
       */
      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            'Failed to open IndexedDB.'
          )
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          'IndexedDB is blocked by another browser tab.'
        )
      );
    };
  });
}

/**
 * Normalize an image before storing it.
 *
 * The rest of the application normally uses raw base64.
 * Keeping raw base64 here keeps sessionStorage lightweight
 * and lets AnswerSheetViewer determine the correct MIME type.
 */
function normalizeImageValue(
  image: string
): string {
  if (
    typeof image !== 'string'
  ) {
    return '';
  }

  return image.trim();
}

/**
 * Save answer-sheet images for an assessment.
 */
export async function saveAnswerImages(
  key: string,
  images: string[]
): Promise<void> {
  if (!key) {
    throw new Error(
      'A storage key is required.'
    );
  }

  if (!Array.isArray(images)) {
    throw new Error(
      'Answer images must be an array.'
    );
  }

  const cleanedImages =
    images
      .map(normalizeImageValue)
      .filter(Boolean);

  if (
    cleanedImages.length === 0
  ) {
    throw new Error(
      'No answer-sheet images were provided.'
    );
  }

  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const closeDatabase = () => {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      };

      const fail = (
        error: unknown
      ) => {
        if (finished) return;

        finished = true;
        closeDatabase();

        reject(
          error instanceof Error
            ? error
            : new Error(
                'Failed to save answer-sheet images.'
              )
        );
      };

      const succeed = () => {
        if (finished) return;

        finished = true;
        closeDatabase();
        resolve();
      };

      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            STORE_NAME,
            'readwrite'
          );
      } catch (error) {
        fail(error);
        return;
      }

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const record:
        StoredAnswerImages = {
        key,
        images: cleanedImages,
        createdAt: Date.now(),
      };

      let request: IDBRequest;

      try {
        request =
          store.put(record);
      } catch (error) {
        fail(error);
        return;
      }

      request.onerror = () => {
        fail(
          request.error ||
            new Error(
              'Failed to save answer-sheet images.'
            )
        );
      };

      transaction.oncomplete =
        () => {
          succeed();
        };

      transaction.onerror =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Failed to save answer-sheet images.'
              )
          );
        };

      transaction.onabort =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Answer-sheet storage transaction was aborted.'
              )
          );
        };
    }
  );
}

/**
 * Retrieve answer-sheet images.
 */
export async function getAnswerImages(
  key: string
): Promise<string[]> {
  if (!key) {
    return [];
  }

  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const closeDatabase = () => {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      };

      const fail = (
        error: unknown
      ) => {
        if (finished) return;

        finished = true;
        closeDatabase();

        reject(
          error instanceof Error
            ? error
            : new Error(
                'Failed to load answer-sheet images.'
              )
        );
      };

      const succeed = (
        images: string[]
      ) => {
        if (finished) return;

        finished = true;
        closeDatabase();

        resolve(images);
      };

      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            STORE_NAME,
            'readonly'
          );
      } catch (error) {
        fail(error);
        return;
      }

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      let request: IDBRequest;

      try {
        request =
          store.get(key);
      } catch (error) {
        fail(error);
        return;
      }

      request.onsuccess = () => {
        const record =
          request.result as
            | StoredAnswerImages
            | undefined;

        if (
          !record ||
          !Array.isArray(
            record.images
          )
        ) {
          succeed([]);
          return;
        }

        const images =
          record.images
            .filter(
              (
                image
              ): image is string =>
                typeof image ===
                  'string' &&
                image.trim().length > 0
            )
            .map(
              normalizeImageValue
            );

        succeed(images);
      };

      request.onerror = () => {
        fail(
          request.error ||
            new Error(
              'Failed to load answer-sheet images.'
            )
        );
      };

      transaction.onerror =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Failed to read answer-sheet images.'
              )
          );
        };

      transaction.onabort =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Answer-sheet read transaction was aborted.'
              )
          );
        };
    }
  );
}

/**
 * Check whether images exist for an assessment.
 */
export async function hasAnswerImages(
  key: string
): Promise<boolean> {
  const images =
    await getAnswerImages(key);

  return images.length > 0;
}

/**
 * Delete answer-sheet images.
 */
export async function deleteAnswerImages(
  key: string
): Promise<void> {
  if (!key) {
    return;
  }

  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const closeDatabase = () => {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      };

      const succeed = () => {
        if (finished) return;

        finished = true;
        closeDatabase();
        resolve();
      };

      const fail = (
        error: unknown
      ) => {
        if (finished) return;

        finished = true;
        closeDatabase();

        reject(
          error instanceof Error
            ? error
            : new Error(
                'Failed to delete answer-sheet images.'
              )
        );
      };

      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            STORE_NAME,
            'readwrite'
          );
      } catch (error) {
        fail(error);
        return;
      }

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      try {
        store.delete(key);
      } catch (error) {
        fail(error);
        return;
      }

      transaction.oncomplete =
        () => {
          succeed();
        };

      transaction.onerror =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Failed to delete answer-sheet images.'
              )
          );
        };

      transaction.onabort =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Answer-sheet deletion was aborted.'
              )
          );
        };
    }
  );
}

/**
 * Delete all stored answer sheets.
 */
export async function clearAllAnswerImages(): Promise<void> {
  const db =
    await openDatabase();

  return new Promise(
    (resolve, reject) => {
      let finished = false;

      const closeDatabase = () => {
        try {
          db.close();
        } catch {
          // Ignore close errors.
        }
      };

      const succeed = () => {
        if (finished) return;

        finished = true;
        closeDatabase();
        resolve();
      };

      const fail = (
        error: unknown
      ) => {
        if (finished) return;

        finished = true;
        closeDatabase();

        reject(
          error instanceof Error
            ? error
            : new Error(
                'Failed to clear answer-sheet images.'
              )
        );
      };

      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            STORE_NAME,
            'readwrite'
          );
      } catch (error) {
        fail(error);
        return;
      }

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      try {
        store.clear();
      } catch (error) {
        fail(error);
        return;
      }

      transaction.oncomplete =
        () => {
          succeed();
        };

      transaction.onerror =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Failed to clear answer-sheet images.'
              )
          );
        };

      transaction.onabort =
        () => {
          fail(
            transaction.error ||
              new Error(
                'Answer-sheet clearing was aborted.'
              )
          );
        };
    }
  );
}