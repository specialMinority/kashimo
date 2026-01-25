/**
 * Kashimo Design System
 * P2P 금전거래 관리 앱 디자인 토큰
 */

export const colors = {
    // Primary Colors
    primary: {
        main: '#4ECDC4',      // 민트 그린 - 메인 컬러
        light: '#7EDDD6',
        dark: '#3BA99E',
    },

    // Accent Colors
    accent: {
        coral: '#FF6B6B',     // 코랄 핑크 - 경고/긴급
        coralLight: '#FF8E8E',
        coralDark: '#E55555',
    },

    // Semantic Colors
    semantic: {
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3',
    },

    // Money Colors
    money: {
        receive: '#4ECDC4',   // 받을 돈 - 민트
        pay: '#FF6B6B',       // 갚을 돈 - 코랄
    },

    // Neutral Colors
    neutral: {
        white: '#FFFFFF',
        background: '#F8FAFA',
        card: '#FFFFFF',
        border: '#E0E0E0',
        textPrimary: '#1A1A1A',
        textSecondary: '#666666',
        textTertiary: '#999999',
        disabled: '#CCCCCC',
    },

    // Dark Mode Colors
    dark: {
        background: '#121212',
        card: '#1E1E1E',
        border: '#333333',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B0B0',
    },
};

export const typography = {
    fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
        // 일본어 폰트는 Noto Sans JP 사용 예정
    },

    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },

    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        loose: 1.8,
    },

    // Typography Variants
    subtitle1: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    body1: {
        fontSize: 16,
        fontWeight: 'normal',
    },
    caption: {
        fontSize: 12,
        fontWeight: 'normal',
    },
    button: {
        fontSize: 16,
        fontWeight: 'bold',
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
};

// 금액 포맷팅 유틸리티
export const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString('ja-JP')}`;
};

// D-Day 계산 유틸리티
export const getDDay = (dueDate: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'D-Day';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
};
