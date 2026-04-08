export type OfflineEntity = 'produtos' | 'vendas' | 'itensVenda' | 'filaSync';

const DB_NAME = 'syncho_pdv_offline';
const DB_VERSION = 1;

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('produtos')) {
        db.createObjectStore('produtos', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('vendas')) {
        db.createObjectStore('vendas', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('itensVenda')) {
        db.createObjectStore('itensVenda', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('filaSync')) {
        db.createObjectStore('filaSync', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const withStore = async <T>(
  storeName: OfflineEntity,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
};

export const localDbService = {
  async put<T extends { id: string }>(storeName: OfflineEntity, value: T): Promise<T> {
    await withStore(storeName, 'readwrite', (store) => store.put(value));
    return value;
  },

  async getAll<T>(storeName: OfflineEntity): Promise<T[]> {
    return withStore(storeName, 'readonly', (store) => store.getAll()) as Promise<T[]>;
  },

  async delete(storeName: OfflineEntity, id: string): Promise<void> {
    await withStore(storeName, 'readwrite', (store) => store.delete(id));
  }
};
