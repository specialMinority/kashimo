import { Platform } from 'react-native';
import { DatabaseAdapter } from './db/adapter';
import { NativeSQLiteAdapter } from './db/NativeSQLiteAdapter';
import { WebLocalStorageAdapter } from './db/WebLocalStorageAdapter';
import { Transaction, CreateTransactionInput, DashboardSummary } from '../types';

let adapter: DatabaseAdapter | null = null;

export const initDatabase = async () => {
    if (Platform.OS === 'web') {
        adapter = new WebLocalStorageAdapter();
    } else {
        adapter = new NativeSQLiteAdapter();
    }

    try {
        await adapter!.init();
        console.log(`✅ Database initialized using ${Platform.OS === 'web' ? 'WebLocalStorage' : 'NativeSQLite'} adapter`);
    } catch (error) {
        console.error('❌ Failed to init database adapter:', error);
    }
};

const getAdapter = (): DatabaseAdapter => {
    if (!adapter) {
        throw new Error('Database adapter not initialized. Call initDatabase() first.');
    }
    return adapter;
};

// --- Delegated CRUD Operations ---

export const addTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
    return getAdapter().addTransaction(input);
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
    return getAdapter().getAllTransactions();
};

export const getTransaction = async (id: string): Promise<Transaction | null> => {
    return getAdapter().getTransaction(id);
};

export const getPendingTransactions = async (): Promise<Transaction[]> => {
    return getAdapter().getPendingTransactions();
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<void> => {
    return getAdapter().updateTransaction(id, updates);
};

export const removeTransaction = async (id: string): Promise<void> => {
    return getAdapter().removeTransaction(id);
};

export const markTransactionComplete = async (id: string): Promise<void> => {
    return getAdapter().markTransactionComplete(id);
};

export const revertTransactionStatus = async (id: string): Promise<void> => {
    return getAdapter().revertTransactionStatus(id);
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    return getAdapter().getDashboardSummary();
};

export const replaceAllTransactions = async (transactions: Transaction[]): Promise<void> => {
    return getAdapter().replaceAllTransactions(transactions);
};

// For compatibility if needed, though getDb() was SQLite specific. 
// We should remove getDb usage from other files if present, or mock it if strictly necessary, 
// but Phase 2 migration already moved all logic here.
export const getDb = () => {
    console.warn('getDb() is deprecated in Adapter pattern. Use exported functions instead.');
    // This might break if any component accesses db directly. But our rules said logic is in database.ts.
    // If necessary, cast adapter to NativeSQLiteAdapter and access private db, but better to avoid.
    throw new Error('getDb() is not supported in Adapter architecture');
};
