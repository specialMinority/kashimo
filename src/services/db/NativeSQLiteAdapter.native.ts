import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DatabaseAdapter } from './adapter';
import { Transaction, CreateTransactionInput, TransactionStatus, DashboardSummary } from '../../types';

export class NativeSQLiteAdapter implements DatabaseAdapter {
    private db: SQLite.SQLiteDatabase | null = null;

    async init(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync('kashimo.db');
            await this.db.execAsync(`
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY NOT NULL,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL,
                    counterparty TEXT NOT NULL,
                    dueDate TEXT,
                    status TEXT NOT NULL,
                    memo TEXT,
                    createdAt TEXT NOT NULL,
                    completedAt TEXT
                );
            `);
            
            // Check and migrate schema if needed
            await this.migrateSchemaIfNeeded();
            
            console.log('✅ [Native] Local Database initialized');
        } catch (error) {
            console.error('❌ Failed to init native database:', error);
            throw error;
        }
    }

    private async migrateSchemaIfNeeded(): Promise<void> {
        const db = this.getDb();
        try {
            // Check table info to see if dueDate is NOT NULL
            const tableInfo = await db.getAllAsync<{ name: string, notnull: number }>(
                `PRAGMA table_info(transactions)`
            );
            
            const dueDateColumn = tableInfo.find(col => col.name === 'dueDate');
            
            // If dueDate exists and has NOT NULL constraint (notnull === 1), we need to migrate
            if (dueDateColumn && dueDateColumn.notnull === 1) {
                console.log('⚠️ [Native] Detected strict schema on dueDate. Starting migration...');
                
                await db.runAsync('BEGIN TRANSACTION');
                
                // 1. Rename existing table
                await db.runAsync('ALTER TABLE transactions RENAME TO transactions_old');
                
                // 2. Create new table with correct schema (dueDate allowing NULL)
                await db.runAsync(`
                    CREATE TABLE transactions (
                        id TEXT PRIMARY KEY NOT NULL,
                        amount REAL NOT NULL,
                        type TEXT NOT NULL,
                        counterparty TEXT NOT NULL,
                        dueDate TEXT,
                        status TEXT NOT NULL,
                        memo TEXT,
                        createdAt TEXT NOT NULL,
                        completedAt TEXT
                    )
                `);
                
                // 3. Copy data
                await db.runAsync(`
                    INSERT INTO transactions (id, amount, type, counterparty, dueDate, status, memo, createdAt, completedAt)
                    SELECT id, amount, type, counterparty, dueDate, status, memo, createdAt, completedAt
                    FROM transactions_old
                `);
                
                // 4. Drop old table
                await db.runAsync('DROP TABLE transactions_old');
                
                await db.runAsync('COMMIT');
                console.log('✅ [Native] Schema migration completed: dueDate is now nullable');
            }
        } catch (error) {
            console.error('❌ [Native] Schema migration failed:', error);
            try {
                await db.runAsync('ROLLBACK');
            } catch (e) {
                // Ignore rollback error if transaction wasn't active
            }
        }
    }

    private getDb(): SQLite.SQLiteDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }

    async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
        const db = this.getDb();
        const id = Crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const status: TransactionStatus = 'pending';

        await db.runAsync(
            `INSERT INTO transactions (id, amount, type, counterparty, dueDate, status, memo, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, input.amount, input.type, input.counterparty, input.dueDate || null, status, input.memo || null, createdAt]
        );

        return {
            id,
            ...input,
            status,
            createdAt,
            userId: 'local-user',
            reminders: []
        };
    }

    async getAllTransactions(): Promise<Transaction[]> {
        const db = this.getDb();
        const result = await db.getAllAsync<Transaction>(
            `SELECT * FROM transactions ORDER BY 
             CASE WHEN dueDate IS NULL THEN 1 ELSE 0 END,
             dueDate ASC`
        );
        return result.map(row => ({ ...row, userId: 'local-user', reminders: [] }));
    }

    async getTransaction(id: string): Promise<Transaction | null> {
        const db = this.getDb();
        const result = await db.getFirstAsync<Transaction>(
            `SELECT * FROM transactions WHERE id = ?`,
            [id]
        );
        if (!result) return null;
        return { ...result, userId: 'local-user', reminders: [] };
    }

    async getPendingTransactions(): Promise<Transaction[]> {
        const db = this.getDb();
        const result = await db.getAllAsync<Transaction>(
            `SELECT * FROM transactions WHERE status = 'pending' ORDER BY 
             CASE WHEN dueDate IS NULL THEN 1 ELSE 0 END,
             dueDate ASC`
        );
        return result.map(row => ({ ...row, userId: 'local-user', reminders: [] }));
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
        const db = this.getDb();
        const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'userId' && key !== 'createdAt');
        if (fields.length === 0) return;

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(key => (updates as any)[key]);

        await db.runAsync(
            `UPDATE transactions SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
    }

    async removeTransaction(id: string): Promise<void> {
        const db = this.getDb();
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    }

    async markTransactionComplete(id: string): Promise<void> {
        const db = this.getDb();
        const completedAt = new Date().toISOString();
        await db.runAsync(
            `UPDATE transactions SET status = 'completed', completedAt = ? WHERE id = ?`,
            [completedAt, id]
        );
    }

    async revertTransactionStatus(id: string): Promise<void> {
        const db = this.getDb();
        await db.runAsync(
            `UPDATE transactions SET status = 'pending', completedAt = NULL WHERE id = ?`,
            [id]
        );
    }

    async getDashboardSummary(): Promise<DashboardSummary> {
        const db = this.getDb();

        const result = await db.getAllAsync<{ type: string; total: number; count: number }>(
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

        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const upcoming = await db.getAllAsync<Transaction>(
            `SELECT * FROM transactions 
             WHERE status = 'pending' 
             AND dueDate IS NOT NULL
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
    }

    async replaceAllTransactions(transactions: Transaction[]): Promise<void> {
        const db = this.getDb();

        // Use withTransactionAsync for atomicity if available, or just sequential await
        // Expo SQLite next usually supports exclusive execution
        try {
            await db.runAsync('BEGIN TRANSACTION');
            await db.runAsync('DELETE FROM transactions');

            for (const t of transactions) {
                await db.runAsync(
                    `INSERT INTO transactions (id, amount, type, counterparty, dueDate, status, memo, createdAt, completedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [t.id, t.amount, t.type, t.counterparty, t.dueDate || null, t.status, t.memo || null, t.createdAt, t.completedAt || null]
                );
            }
            await db.runAsync('COMMIT');
        } catch (e) {
            await db.runAsync('ROLLBACK');
            throw e;
        }
    }
}
