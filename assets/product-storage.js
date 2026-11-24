(function (root) {
  'use strict';

  const schemaVersion = 3;
  const legacyKey = 'wanshili-product-demo-v1';
  const databaseName = 'wanshili-product';
  const dataStore = 'documents';

  function create({ indexedDB, legacy, seed, validEvent }) {
    let connection;

    function database() {
      if (connection) return connection;
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(dataStore);
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = undefined;
          };
          resolve(db);
        };
        request.onerror = () => reject(request.error);
      }).catch(error => {
        connection = undefined;
        throw error;
      });
      return connection;
    }

    function valid(data) {
      return data && Array.isArray(data.events) && data.events.every(validEvent) &&
        data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings);
    }

    function prepare(data) {
      if (data !== undefined) {
        if (data.schemaVersion !== schemaVersion || !valid(data)) {
          throw Error('本地数据版本或格式暂无法读取，原数据已保留。');
        }
        return data;
      }
      const raw = legacy.getItem(legacyKey);
      if (raw === null) return seed();
      let old;
      try { old = JSON.parse(raw); } catch {}
      if (old?.schemaVersion !== 2 || !valid(old)) {
        throw Error('旧版日程暂无法迁移，原数据已保留。请先导出备份。');
      }
      return { ...old, schemaVersion, revision: 0, generation: 0 };
    }

    async function write(change) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(dataStore, 'readwrite');
        const store = transaction.objectStore(dataStore);
        const request = store.get('state');
        let next, failure;
        request.onsuccess = () => {
          try {
            const current = prepare(request.result);
            next = current;
            if (change) {
              next = change(current, previous => store.put(previous, 'before-reset')) || current;
              next.revision = (current.revision || 0) + 1;
            }
            if (change || request.result === undefined) store.put(next, 'state');
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };
        transaction.oncomplete = () => resolve(next);
        transaction.onabort = () => reject(failure || transaction.error || Error('本地保存中断，请重试。'));
      });
    }

    async function read(key) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const request = db.transaction(dataStore).objectStore(dataStore).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function backup() {
      const [current, beforeReset] = await Promise.allSettled([read('state'), read('before-reset')]);
      let legacyData;
      try { legacyData = legacy.getItem(legacyKey); } catch {}
      const data = {
        exportedAt: new Date().toISOString(),
        current: current.value,
        beforeReset: beforeReset.value,
        legacy: legacyData ?? undefined
      };
      if (!data.current && !data.beforeReset && data.legacy === undefined) throw Error('没有可导出的本地数据。');
      return data;
    }

    return { initialize: () => write(), update: write, read: () => read('state'), backup };
  }

  root.WanshiliStorage = { create, schemaVersion };
})(typeof window === 'object' ? window : globalThis);
