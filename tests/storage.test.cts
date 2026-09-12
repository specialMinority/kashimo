const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function loadTs(filename, mocks = {}) {
    const absolute = path.resolve(filename);
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const localRequire = name => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name.startsWith('.')) {
            const base = path.resolve(path.dirname(absolute), name);
            return loadTs(fs.existsSync(base + '.ts') ? base + '.ts' : path.join(base, 'index.ts'), mocks);
        }
        return require(name);
    };
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
    return module.exports;
}
const record = (id, extra = {}) => ({ id, userId: 'local-user', counterparty: '友だち ' + id, amount: 1000, type: 'lent', status: 'pending', createdAt: '2026-09-12T00:00:00Z', reminders: [], ...extra });
const cryptoMock = { 'expo-crypto': { randomUUID } };

function webFixture(data) {
    let raw = JSON.stringify(data);
    let writes = 0;
    let failure = false;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: key => key === 'kashimo_transactions' ? raw : null,
        setItem: (key, value) => { assert.equal(key, 'kashimo_transactions'); if (failure) throw new Error('QuotaExceededError'); writes++; raw = value; },
    } });
    const { WebLocalStorageAdapter } = loadTs('src/services/db/WebLocalStorageAdapter.ts', cryptoMock);
    return { adapter: new WebLocalStorageAdapter(), fresh: () => new WebLocalStorageAdapter(), raw: () => raw, writes: () => writes, fail: () => { failure = true; }, corrupt: () => { raw = '{invalid'; } };
}

async function nativeFixture(records) {
    const db = new DatabaseSync(':memory:');
    let calls = 0;
    const bridge = {
        execAsync: async sql => { db.exec(sql); },
        runAsync: async (sql, values = []) => { calls++; return db.prepare(sql).run(...values); },
        getAllAsync: async (sql, values = []) => db.prepare(sql).all(...values),
        getFirstAsync: async (sql, values = []) => db.prepare(sql).get(...values),
        withExclusiveTransactionAsync: async task => {
            db.exec('BEGIN');
            try { await task(bridge); db.exec('COMMIT'); }
            catch (e) { db.exec('ROLLBACK'); throw e; }
        },
    };
    const { NativeSQLiteAdapter } = loadTs('src/services/db/NativeSQLiteAdapter.native.ts', { ...cryptoMock, 'expo-sqlite': { openDatabaseAsync: async () => bridge } });
    const adapter = new NativeSQLiteAdapter();
    await adapter.init();
    await adapter.replaceAllTransactions(records);
    calls = 0;
    return { adapter, db, calls: () => calls };
}

test('web: selective deletion preserves hidden/completed records and metadata; one atomic write', async () => {
    const untouched = record('borrowed', { type: 'borrowed', memo: 'Keep exactly', counterpartyContact: 'private' });
    const f = webFixture([record('a'), record('done', { status: 'completed' }), untouched]);
    await f.adapter.removeTransactions(['a', 'done', 'a', 'unknown']);
    assert.deepEqual(await f.fresh().getAllTransactions(), [untouched]);
    assert.equal(f.writes(), 1);
    const summary = await f.fresh().getDashboardSummary();
    assert.equal(summary.totalToReceive, 0); assert.equal(summary.totalToPay, 1000);
});

test('web: empty selection is a no-op and deleting every record persists an empty list', async () => {
    const f = webFixture([record('a'), record('b')]);
    await f.adapter.removeTransactions([]);
    assert.equal(f.writes(), 0);
    await f.adapter.removeTransactions(['a', 'b']);
    assert.deepEqual(await f.fresh().getAllTransactions(), []);
});

test('web: write failure rejects without changing existing data', async () => {
    const f = webFixture([record('a'), record('b')]);
    const before = f.raw(); f.fail();
    await assert.rejects(f.adapter.removeTransactions(['a']), /Quota/);
    assert.equal(f.raw(), before);
});

test('web: corrupted storage is never silently overwritten by deletion', async () => {
    const f = webFixture([record('a')]); f.corrupt();
    await assert.rejects(f.adapter.removeTransactions(['a']));
    assert.equal(f.raw(), '{invalid'); assert.equal(f.writes(), 0);
});

test('web: large selection remains one storage write', async () => {
    const f = webFixture(Array.from({ length: 1501 }, (_, i) => record(String(i))));
    await f.adapter.removeTransactions(Array.from({ length: 1500 }, (_, i) => String(i)));
    assert.deepEqual((await f.fresh().getAllTransactions()).map(t => t.id), ['1500']);
    assert.equal(f.writes(), 1);
});

test('native: parameterized selective deletion preserves unselected records', async () => {
    const f = await nativeFixture([record('a'), record('keep', { type: 'borrowed' }), record('done', { status: 'completed' })]);
    try {
        await f.adapter.removeTransactions(['a', 'done', "'); DELETE FROM transactions; --"]);
        assert.deepEqual((await f.adapter.getAllTransactions()).map(t => t.id), ['keep']);
        const summary = await f.adapter.getDashboardSummary();
        assert.equal(summary.totalToPay, 1000); assert.equal(summary.totalToReceive, 0);
    } finally { f.db.close(); }
});

test('native: more than 999 selected IDs delete safely in one transaction', async () => {
    const f = await nativeFixture(Array.from({ length: 1501 }, (_, i) => record(String(i))));
    try {
        await f.adapter.removeTransactions(Array.from({ length: 1500 }, (_, i) => String(i)));
        assert.deepEqual((await f.adapter.getAllTransactions()).map(t => t.id), ['1500']);
        assert.equal(f.calls(), 3);
    } finally { f.db.close(); }
});

test('native: a failure in a later batch rolls back earlier deletions', async () => {
    const records = Array.from({ length: 1101 }, (_, i) => record(String(i)));
    const f = await nativeFixture(records);
    try {
        f.db.exec("CREATE TRIGGER reject_delete BEFORE DELETE ON transactions WHEN OLD.id = '1050' BEGIN SELECT RAISE(ABORT, 'delete rejected'); END;");
        await assert.rejects(f.adapter.removeTransactions(records.map(t => t.id)), /delete rejected/);
        assert.equal((await f.adapter.getAllTransactions()).length, 1101);
    } finally { f.db.close(); }
});

test('native: empty selection does not issue a write and cleared optional fields bind NULL', async () => {
    const f = await nativeFixture([record('a', { dueDate: '2026-09-20', memo: 'old' })]);
    try {
        await f.adapter.removeTransactions([]); assert.equal(f.calls(), 0);
        await f.adapter.updateTransaction('a', { dueDate: undefined, memo: undefined });
        assert.equal((await f.adapter.getTransaction('a')).dueDate, null);
    } finally { f.db.close(); }
});

function notificationFixture(failedId = null) {
    let map = { a: ['n1', 'n2'], b: ['n3'], keep: ['n4'] };
    const cancelled = [];
    const service = loadTs('src/services/notifications.ts', {
        'expo-notifications': {
            setNotificationHandler() {},
            cancelScheduledNotificationAsync: async id => { if (id === failedId) throw new Error('OS busy'); cancelled.push(id); },
        },
        'expo-device': { isDevice: true },
        'react-native': { Platform: { OS: 'android' } },
        '@react-native-async-storage/async-storage': {
            getItem: async () => JSON.stringify(map),
            setItem: async (_key, raw) => { map = JSON.parse(raw); },
        },
        '../constants': { DEFAULT_REMINDER_DAYS: [7, 3, 1, 0] },
    });
    return { service, map: () => map, cancelled };
}
test('notifications: selected reminders cancel without losing unrelated entries', async () => {
    const f = notificationFixture();
    assert.deepEqual(await f.service.cancelTransactionsReminders(['a', 'b', 'a']), []);
    assert.deepEqual(f.cancelled, ['n1', 'n2', 'n3']);
    assert.deepEqual(f.map(), { keep: ['n4'] });
});
test('notifications: failed IDs are retained and reported for retry', async () => {
    const f = notificationFixture('n2');
    assert.deepEqual(await f.service.cancelTransactionsReminders(['a', 'b']), ['a']);
    assert.deepEqual(f.map(), { a: ['n2'], keep: ['n4'] });
});
test('notifications: restart removes orphan reminders only', async () => {
    const f = notificationFixture();
    await f.service.cleanUpDeletedTransactionReminders(['keep']);
    assert.deepEqual(f.map(), { keep: ['n4'] });
});

test('database service: a failed save never cancels reminders', async () => {
    let cancelled = false;
    class Adapter { async init() {} async removeTransactions() { throw new Error('storage unavailable'); } }
    const service = loadTs('src/services/database.ts', {
        'react-native': { Platform: { OS: 'web' } },
        './db/NativeSQLiteAdapter': { NativeSQLiteAdapter: Adapter },
        './db/WebLocalStorageAdapter': { WebLocalStorageAdapter: Adapter },
        './notifications': { cancelTransactionsReminders: async () => { cancelled = true; return []; } },
    });
    await service.initDatabase();
    await assert.rejects(service.removeTransactions(['a']));
    assert.equal(cancelled, false);
});
test('database service: reminder failure does not disguise a committed delete', async () => {
    const removed = [];
    class Adapter { async init() {} async removeTransactions(ids) { removed.push(...ids); } }
    const service = loadTs('src/services/database.ts', {
        'react-native': { Platform: { OS: 'web' } },
        './db/NativeSQLiteAdapter': { NativeSQLiteAdapter: Adapter },
        './db/WebLocalStorageAdapter': { WebLocalStorageAdapter: Adapter },
        './notifications': { cancelTransactionsReminders: async () => ['a'] },
    });
    await service.initDatabase();
    assert.deepEqual(await service.removeTransactions(['a', 'a']), { reminderCleanupFailed: true });
    assert.deepEqual(removed, ['a']);
});

test('dates: today is not overdue; impossible dates are rejected', () => {
    const { localDateKey, isOverdueDate, validDateInput } = loadTs('src/utils/date.ts');
    assert.equal(isOverdueDate(localDateKey()), false);
    assert.equal(isOverdueDate('2000-01-01'), true);
    assert.equal(validDateInput('2026-02-30'), false);
    assert.equal(validDateInput('2028-02-29'), true);
    assert.equal(validDateInput('20260913'), true);
});

