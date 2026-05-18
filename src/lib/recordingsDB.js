const DB_NAME = 'PianoFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

/**
 * Initializes and returns the IndexedDB instance
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export const recordingsDB = {
  /**
   * Save a recording to the database
   */
  async addRecording(blob, filename, duration, size) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        name: filename,
        blob: blob,
        type: blob.type || 'audio/webm',
        duration: duration || 0,
        size: size || blob.size || 0,
        date: new Date().toISOString(),
        favorite: false,
      };

      const request = store.add(record);

      request.onsuccess = () => {
        resolve(request.result); // Returns the auto-incremented ID
      };

      request.onerror = () => {
        reject(new Error('Failed to save recording'));
      };
    });
  },

  /**
   * Get all recordings
   */
  async getAllRecordings() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve recordings'));
      };
    });
  },

  /**
   * Update recording metadata (like name or favorite status)
   */
  async updateRecording(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Get the existing record first
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (!data) {
          reject(new Error('Recording not found'));
          return;
        }

        const updatedData = { ...data, ...updates };
        const putRequest = store.put(updatedData);

        putRequest.onsuccess = () => {
          resolve(updatedData);
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update recording'));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get recording for update'));
      };
    });
  },

  /**
   * Delete a single recording
   */
  async deleteRecording(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to delete recording'));
      };
    });
  },

  /**
   * Delete multiple recordings
   */
  async deleteMultipleRecordings(ids) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let successCount = 0;
      let errorOccurred = false;

      ids.forEach((id) => {
        const request = store.delete(id);
        request.onsuccess = () => {
          successCount++;
          if (successCount === ids.length) {
            resolve(true);
          }
        };
        request.onerror = () => {
          errorOccurred = true;
        };
      });

      transaction.oncomplete = () => {
        if (errorOccurred) {
          reject(new Error('Failed to delete some recordings'));
        } else {
          resolve(true);
        }
      };
    });
  },
};
