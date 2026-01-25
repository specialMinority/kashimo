/**
 * Kashimo Constants
 * 앱 전체에서 사용되는 상수 정의
 */

// 앱 정보
export const APP_NAME = 'カシモ';
export const APP_SLOGAN = '友達との お金、もう忘れない';
export const APP_VERSION = '1.0.0';

// 알림 기본 설정
export const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0];  // D-7, D-3, D-1, D-Day

// 거래 상태 라벨 (일본어)
export const TRANSACTION_STATUS_LABELS = {
    pending: '未精算',      // 미정산
    completed: '精算済み',  // 정산 완료
    overdue: '期限超過',    // 기한 초과
} as const;

// 거래 유형 라벨 (일본어)
export const TRANSACTION_TYPE_LABELS = {
    lent: '貸した',         // 빌려줌
    borrowed: '借りた',     // 빌림
} as const;

// LINE 메시지 템플릿
export const LINE_TEMPLATES = {
    gentle: (name: string, amount: number, memo?: string) =>
        `${name}さん! ${memo ? memo + 'の' : ''}${amount.toLocaleString()}円の件、覚えてる？😊 時間ある時に精算してくれると嬉しいな～`,

    reminder: (name: string, amount: number, daysLeft: number) =>
        `${name}さん、${amount.toLocaleString()}円の返済期限まであと${daysLeft}日だよ！📅 確認お願いね🙏`,

    dueToday: (name: string, amount: number) =>
        `${name}さん、今日が${amount.toLocaleString()}円の返済日だよ！🔔 よろしくね！`,

    overdue: (name: string, amount: number, daysOverdue: number) =>
        `${name}さん、${amount.toLocaleString()}円の返済期限が${daysOverdue}日過ぎてるみたい...💦 確認してくれる？`,
} as const;

// Firebase Collection Names
export const COLLECTIONS = {
    USERS: 'users',
    TRANSACTIONS: 'transactions',
    SETTINGS: 'settings',
} as const;

// Storage Keys (AsyncStorage)
export const STORAGE_KEYS = {
    USER_ID: '@kashimo/userId',
    SETTINGS: '@kashimo/settings',
    ONBOARDING_COMPLETE: '@kashimo/onboardingComplete',
} as const;

// 날짜 포맷
export const DATE_FORMAT = {
    display: 'yyyy/MM/dd',
    api: 'yyyy-MM-dd',
} as const;
