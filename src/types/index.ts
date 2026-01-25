/**
 * Kashimo Type Definitions
 * 앱에서 사용하는 주요 타입 정의
 */

// 거래 유형
export type TransactionType = 'lent' | 'borrowed';

// 거래 상태
export type TransactionStatus = 'pending' | 'completed' | 'overdue';

// 알림 상태
export interface Reminder {
    scheduledAt: string;  // ISO date string
    sent: boolean;
}

// 거래 데이터
export interface Transaction {
    id: string;
    userId: string;
    counterparty: string;           // 상대방 이름
    counterpartyContact?: string;   // 상대방 연락처 (optional)
    amount: number;
    type: TransactionType;
    dueDate: string;                // ISO date string
    status: TransactionStatus;
    memo?: string;
    receiptUrl?: string;            // 영수증 사진 URL
    reminders: Reminder[];
    createdAt: string;
    completedAt?: string;
}

// 새 거래 생성 시 사용
export interface CreateTransactionInput {
    counterparty: string;
    counterpartyContact?: string;
    amount: number;
    type: TransactionType;
    dueDate: string;
    memo?: string;
}

// 사용자 데이터
export interface User {
    id: string;
    name: string;
    email?: string;
    lineId?: string;
    createdAt: string;
}

// 대시보드 요약 데이터
export interface DashboardSummary {
    totalToReceive: number;       // 받을 돈 총합
    totalToPay: number;           // 갚을 돈 총합
    receiveCount: number;         // 받을 건수
    payCount: number;             // 갚을 건수
    upcomingTransactions: Transaction[];  // 이번 주 예정
}

// 알림 설정
export interface NotificationSettings {
    enabled: boolean;
    daysBeforeDue: number[];      // [7, 3, 1, 0] = D-7, D-3, D-1, D-Day
    lineIntegration: boolean;
}

// 앱 설정
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'ko' | 'en';
    notifications: NotificationSettings;
}
