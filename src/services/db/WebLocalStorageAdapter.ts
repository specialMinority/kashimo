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
        if (typeof localStorage === 'undefined') return [];
        const json = localStorage.getItem(this.STORAGE_KEY);
        if (!json) return [];
        try {
            return JSON.parse(json) as Transaction[];
        } catch (e) {
            console.error('Failed to parse localStorage', e);
            return [];
        }
    }

    private saveStoredTransactions(transactions: Transaction[]): void {
        if (typeof localStorage === 'undefined') return;
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
        // ORDER BY dueDate ASC
        return transactions.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    async getTransaction(id: string): Promise<Transaction | null> {
        const transactions = this.getStoredTransactions();
        return transactions.find(t => t.id === id) || null;
    }

    async getPendingTransactions(): Promise<Transaction[]> {
        const transactions = this.getStoredTransactions();
        return transactions
            .filter(t => t.status === 'pending')
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
        const transactions = this.getStoredTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index === -1) return;

        transactions[index] = { ...transactions[index], ...updates };
        this.saveStoredTransactions(transactions);
    }

    async removeTransaction(id: string): Promise<void> {
        let transactions = this.getStoredTransactions();
        transactions = transactions.filter(t => t.id !== id);
        this.saveStoredTransactions(transactions);
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

        let totalToReceive = 0;
        let totalToPay = 0;
        let receiveCount = 0;
        let payCount = 0;

        pending.forEach(t => {
            if (t.type === 'lent') {
                totalToReceive += t.amount;
                receiveCount++;
            } else {
                totalToPay += t.amount;
                payCount++;
            }
        });

        // Upcoming: Due between today and next 7 days
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // Filter: Pending AND Due >= Today AND Due <= NextWeek
        const upcoming = pending
            .filter(t => t.dueDate >= todayStr && t.dueDate <= nextWeekStr)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        return {
            totalToReceive,
            totalToPay,
            receiveCount,
            payCount,
            upcomingTransactions: upcoming,
        };
    }

    async replaceAllTransactions(transactions: Transaction[]): Promise<void> {
        this.saveStoredTransactions(transactions);
    }
}
