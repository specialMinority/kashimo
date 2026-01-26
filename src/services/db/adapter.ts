import { Transaction, CreateTransactionInput, DashboardSummary } from '../../types';

export interface DatabaseAdapter {
    init(): Promise<void>;
    addTransaction(input: CreateTransactionInput): Promise<Transaction>;
    getAllTransactions(): Promise<Transaction[]>;
    getTransaction(id: string): Promise<Transaction | null>;
    getPendingTransactions(): Promise<Transaction[]>;
    updateTransaction(id: string, updates: Partial<Transaction>): Promise<void>;
    removeTransaction(id: string): Promise<void>;
    markTransactionComplete(id: string): Promise<void>;
    revertTransactionStatus(id: string): Promise<void>;
    getDashboardSummary(): Promise<DashboardSummary>;
    replaceAllTransactions(transactions: Transaction[]): Promise<void>;
}
