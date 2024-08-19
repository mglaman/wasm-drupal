export default class CookieMap extends Map {

    name = '/cookies'
    store = 'COOKIES'

    constructor(iterable) {
        super(iterable);

        this._db = this._openDB();
        this._db.then(db => {
            const transaction = db.transaction(this.store, 'readonly');
            const store = transaction.objectStore(this.store);

            const request = store.getAll();
            request.onsuccess = (event) => {
                const entries = event.target.result;
                entries.forEach(({ key, value }) => super.set(key, value));
            };
        });
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.store)) {
                    db.createObjectStore(this.store, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    get(key) {
        return super.get(key);
    }

    set(key, value) {
        if (value === 'deleted') {
            return  this.delete(key)
        }
        super.set(key, value)
        this._persist(key, value);
        return this;
    }

    delete(key) {
        const result = super.delete(key);
        this._delete(key);
        return result;
    }

    clear() {
        super.clear();
        this._clear();
    }

    async _persist(key, value) {
        const store = await this._getTransaction()
        store.put({value, key});
    }

    async _delete(key) {
        const store = await this._getTransaction()
        store.delete(key);
    }

    async _clear() {
        const store = await this._getTransaction()
        store.clear();
    }

    async _getTransaction() {
        const db = await this._db;
        const transaction = db.transaction(this.store, 'readwrite');
        return transaction.objectStore(this.store);
    }
}
