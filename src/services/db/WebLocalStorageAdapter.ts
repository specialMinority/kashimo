import { DatabaseAdapter } from './adapter';
import { Transaction, CreateTransactionInput, TransactionStatus, DashboardSummary } from '../../types';
import * as Crypto from 'expo-crypto';

export class WebLocalStorageAdapter implements DatabaseAdapter {
    private STORAGE_KEY = 'kashimo_transactions';

    async init(): Promise<void> {
        console.log('✅ [Web] LocalStorage Adapter initialized');
        // No async init needed for localStorage, but keeping interface consistent
        return Promise.resolve();
    }

    private getStoredTransactions(): Transaction[] {
        if (typeof localStorage === 'undefined') throw new Error('Storage unavailable');
        const json = localStorage.getItem(this.STORAGE_KEY);
        if (!json) return [];
        const data: unknown = JSON.parse(json);
        if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'string')) {
            throw new Error('Invalid stored transactions. Restore a valid backup before editing.');
        }
        return data as Transaction[];
    }

    private saveStoredTransactions(transactions: Transaction[]): void {
        if (typeof localStorage === 'undefined') throw new Error('Storage unavailable');
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    }

    async addTransaction(input: CreateTransactionInput): Promise<Transaction> {
        const transactions = this.getStoredTransactions();
        const id = Crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const status: TransactionStatus = 'pending';

        const newTransaction: Transaction = {
            id,
            ...input,
            status,
            createdAt,
            userId: 'local-user',
            reminders: []
        };

        transactions.push(newTransaction);
        this.saveStoredTransactions(transactions);

        return newTransaction;
    }

    async getAllTransactions(): Promise<Transaction[]> {
        const transactions = this.getStoredTransactions();
        // ORDER BY dueDate ASC (null values last)
        return transactions.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    }

    async getTransaction(id: string): Promise<Transaction | null> {
        const transactions = this.getStoredTransactions();
        return transactions.find(t => t.id === id) || null;
    }

    async getPendingTransactions(): Promise<Transaction[]> {
        const transactions = this.getStoredTransactions();
        return transactions
            .filter(t => t.status === 'pending')
            .sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            });
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
        const transactions = this.getStoredTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index === -1) return;

        transactions[index] = { ...transactions[index], ...updates };
        this.saveStoredTransactions(transactions);
    }

    async removeTransaction(id: string): Promise<void> {
        return this.removeTransactions([id]);
    }

    async removeTransactions(ids: readonly string[]): Promise<void> {
        if (ids.length === 0) return;
        const selected = new Set(ids);
        const remaining = this.getStoredTransactions().filter(t => !selected.has(t.id));
        // A single setItem is atomic: quota / permission errors leave the old value intact.
        this.saveStoredTransactions(remaining);
    }

    async markTransactionComplete(id: string): Promise<void> {
        const transactions = this.getStoredTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index === -1) return;

        transactions[index].status = 'completed';
        transactions[index].completedAt = new Date().toISOString();
        this.saveStoredTransactions(transactions);
    }

    async revertTransactionStatus(id: string): Promise<void> {
        const transactions = this.getStoredTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index === -1) return;

        transactions[index].status = 'pending';
        transactions[index].completedAt = undefined;
        this.saveStoredTransactions(transactions);
    }

    async getDashboardSummary(): Promise<DashboardSummary> {
        const transactions = this.getStoredTransactions();
        const pending = transactions.filter(t => t.status === 'pending');

        console.log('📊 [getDashboardSummary] Total pending transactions:', pending.length);

        let totalToReceive = 0;
        let totalToPay = 0;
        let receiveCount = 0;
        let payCount = 0;

        pending.forEach(t => {
            const amount = Number(t.amount); // Ensure numeric summation
            if (t.type === 'lent') {
                totalToReceive += amount;
                receiveCount++;
            } else {
                totalToPay += amount;
                payCount++;
            }
        });

        // Upcoming: Due between today and next 7 days
        // Use Local Date for todayStr to match user perspective
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const nextWeekDate = new Date();
        nextWeekDate.setDate(now.getDate() + 7);
        const nextWeekStr = `${nextWeekDate.getFullYear()}-${String(nextWeekDate.getMonth() + 1).padStart(2, '0')}-${String(nextWeekDate.getDate()).padStart(2, '0')}`;

        console.log(`📊 [getDashboardSummary] Range: ${todayStr} ~ ${nextWeekStr}`);

        const upcoming = pending
            .filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextWeekStr)
            .sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            });

        console.log('📊 [getDashboardSummary] Upcoming count:', upcoming.length);

        return {
            totalToReceive,
            totalToPay,
            receiveCount,
            payCount,
            upcomingTransactions: upcoming,
        };
    }

    async replaceAllTransactions(transactions: Transaction[]): Promise<void> {
        console.log('💾 [Web] replaceAllTransactions: Replacing with', transactions.length, 'items');
        this.saveStoredTransactions(transactions);
    }
}
