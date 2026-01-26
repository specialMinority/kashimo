import { DatabaseAdapter } from './adapter';
import { Transaction, CreateTransactionInput, DashboardSummary } from '../../types';

/**
 * Fallback implementation for TypeScript resolution.
 * Real implementations are in .native.ts (Android/iOS) and .web.ts (Web)
 */
export class NativeSQLiteAdapter implements DatabaseAdapter {
    async init(): Promise<void> { throw new Error('Platform specific implementation missing'); }
    async addTransaction(input: CreateTransactionInput): Promise<Transaction> { throw new Error('Platform specific implementation missing'); }
    async getAllTransactions(): Promise<Transaction[]> { throw new Error('Platform specific implementation missing'); }
    async getTransaction(id: string): Promise<Transaction | null> { throw new Error('Platform specific implementation missing'); }
    async getPendingTransactions(): Promise<Transaction[]> { throw new Error('Platform specific implementation missing'); }
    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> { throw new Error('Platform specific implementation missing'); }
    async removeTransaction(id: string): Promise<void> { throw new Error('Platform specific implementation missing'); }
    async markTransactionComplete(id: string): Promise<void> { throw new Error('Platform specific implementation missing'); }
    async revertTransactionStatus(id: string): Promise<void> { throw new Error('Platform specific implementation missing'); }
    async getDashboardSummary(): Promise<DashboardSummary> { throw new Error('Platform specific implementation missing'); }
    async replaceAllTransactions(transactions: Transaction[]): Promise<void> { throw new Error('Platform specific implementation missing'); }
}
