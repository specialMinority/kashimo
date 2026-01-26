import { DatabaseAdapter } from './adapter';
import { Transaction, CreateTransactionInput, DashboardSummary } from '../../types';

export class NativeSQLiteAdapter implements DatabaseAdapter {
    async init(): Promise<void> { throw new Error('NativeSQLiteAdapter not supported on web'); }
    async addTransaction(input: CreateTransactionInput): Promise<Transaction> { throw new Error('Not supported'); }
    async getAllTransactions(): Promise<Transaction[]> { throw new Error('Not supported'); }
    async getTransaction(id: string): Promise<Transaction | null> { throw new Error('Not supported'); }
    async getPendingTransactions(): Promise<Transaction[]> { throw new Error('Not supported'); }
    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> { throw new Error('Not supported'); }
    async removeTransaction(id: string): Promise<void> { throw new Error('Not supported'); }
    async markTransactionComplete(id: string): Promise<void> { throw new Error('Not supported'); }
    async revertTransactionStatus(id: string): Promise<void> { throw new Error('Not supported'); }
    async getDashboardSummary(): Promise<DashboardSummary> { throw new Error('Not supported'); }
    async replaceAllTransactions(transactions: Transaction[]): Promise<void> { throw new Error('Not supported'); }
}
