import * as SQLite from 'expo-sqlite';
import { Transaction, CreateTransactionInput, TransactionStatus, DashboardSummary } from '../types';
import * as Crypto from 'expo-crypto'; // For UUID generation if needed, or just Math.random for simplicity in MVP, or imports

// DB 열기 (없으면 생성)
// expo-sqlite 최신 버전에서는 openDatabaseAsync 등을 권장하지만, 
// 호환성을 위해 기본적인 패턴을 사용하거나, 동기식 메서드를 사용할 수 있습니다.
// 여기서는 최신 Expo SDK 패턴을 따르도록 노력합니다.

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
    try {
        db = await SQLite.openDatabaseAsync('kashimo.db');

        // 테이블 생성
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                counterparty TEXT NOT NULL,
                dueDate TEXT NOT NULL,
                status TEXT NOT NULL,
                memo TEXT,
                createdAt TEXT NOT NULL,
                completedAt TEXT
            );
        `);
        console.log('✅ Local Database initialized');
    } catch (error) {
        console.error('❌ Failed to init database:', error);
    }
};

export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

// --- CRUD Operations ---

// --- CRUD Operations ---

// ... (initDatabase, getDb omitted)

// --- CRUD Operations ---

// 1. Create
export const addTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
    const database = getDb();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status: TransactionStatus = 'pending';

    await database.runAsync(
        `INSERT INTO transactions (id, amount, type, counterparty, dueDate, status, memo, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.amount, input.type, input.counterparty, input.dueDate, status, input.memo || null, createdAt]
    );

    return {
        id,
        ...input,
        status,
        createdAt,
        userId: 'local-user',
        reminders: [] // Initialize empty reminders
    };
};

// ... (getAllTransactions, getPendingTransactions omitted - ensure they also return reminders: [])

// Dashboard Summary Calculation
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const database = getDb();

    // 1. Calculate totals
    const result = await database.getAllAsync<{ type: string; total: number; count: number }>(
        `SELECT type, SUM(amount) as total, COUNT(*) as count 
         FROM transactions 
         WHERE status = 'pending' 
         GROUP BY type`
    );

    let totalToReceive = 0;
    let totalToPay = 0;
    let receiveCount = 0;
    let payCount = 0;

    result.forEach(row => {
        if (row.type === 'lent') {
            totalToReceive = row.total || 0;
            receiveCount = row.count || 0;
        } else {
            totalToPay = row.total || 0;
            payCount = row.count || 0;
        }
    });

    // 2. Get Upcoming Transactions (This week)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // YYYY-MM-DD format comparison works for SQLite strings
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Fetch upcoming transactions (pending, due between today and next week)
    const upcoming = await database.getAllAsync<Transaction>(
        `SELECT * FROM transactions 
         WHERE status = 'pending' 
         AND dueDate >= ? 
         AND dueDate <= ?
         ORDER BY dueDate ASC`,
        [todayStr, nextWeekStr]
    );

    return {
        totalToReceive,
        totalToPay,
        receiveCount,
        payCount,
        upcomingTransactions: upcoming.map(row => ({ ...row, userId: 'local-user', reminders: [] })),
    };
};


// 2. Read (All)
export const getAllTransactions = async (): Promise<Transaction[]> => {
    const database = getDb();
    // 날짜 역순 정렬 (최신순)
    const result = await database.getAllAsync<Transaction>(
        `SELECT * FROM transactions ORDER BY dueDate ASC`
    );
    // userId 호환성 추가 (필요하다면)
    return result.map(row => ({ ...row, userId: 'local-user', reminders: [] }));
};

// 2.5 Read (Single)
export const getTransaction = async (id: string): Promise<Transaction | null> => {
    const database = getDb();
    const result = await database.getFirstAsync<Transaction>(
        `SELECT * FROM transactions WHERE id = ?`,
        [id]
    );
    if (!result) return null;
    return { ...result, userId: 'local-user', reminders: [] };
};

// 3. Read (Status) - Dashboard Summary용
export const getPendingTransactions = async (): Promise<Transaction[]> => {
    const database = getDb();
    const result = await database.getAllAsync<Transaction>(
        `SELECT * FROM transactions WHERE status = 'pending' ORDER BY dueDate ASC`
    );
    return result.map(row => ({ ...row, userId: 'local-user' }));
};

// 4. Update (Edit)
export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<void> => {
    const database = getDb();

    // 동적 쿼리 생성
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'userId' && key !== 'createdAt');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(key => (updates as any)[key]);

    await database.runAsync(
        `UPDATE transactions SET ${setClause} WHERE id = ?`,
        [...values, id]
    );
};

// 5. Delete
export const removeTransaction = async (id: string): Promise<void> => {
    const database = getDb();
    await database.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

// 6. Complete
export const markTransactionComplete = async (id: string): Promise<void> => {
    const database = getDb();
    const completedAt = new Date().toISOString();
    await database.runAsync(
        `UPDATE transactions SET status = 'completed', completedAt = ? WHERE id = ?`,
        [completedAt, id]
    );
};

// 7. Revert (Undo Complete)
export const revertTransactionStatus = async (id: string): Promise<void> => {
    const database = getDb();
    await database.runAsync(
        `UPDATE transactions SET status = 'pending', completedAt = NULL WHERE id = ?`,
        [id]
    );
};
