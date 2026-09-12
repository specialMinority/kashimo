import { Platform } from 'react-native';
/**
 * Kashimo Design System
 * P2P 금전거래 관리 앱 디자인 토큰
 */

export const colors = {
    // Primary Colors
    primary: {
        main: '#3F6154',
        light: '#E8EEE7',
        dark: '#29473C',
    },

    // Accent Colors
    accent: {
        coral: '#A45D49',
        coralLight: '#F6E8DF',
        coralDark: '#884333',
    },

    // Semantic Colors
    semantic: {
        success: '#3F6154',
        warning: '#8D651F',
        error: '#AD403C',
        info: '#486F8A',
    },

    // Money Colors
    money: {
        receive: '#3F6154',
        pay: '#A45D49',
    },

    // Neutral Colors
    neutral: {
        white: '#FFFFFF',
        background: '#F6F3EC',
        card: '#FFFDF9',
        border: '#E6E2D9',
        textPrimary: '#2F3933',
        textSecondary: '#657067',
        textTertiary: '#747A71',
        disabled: '#C6CCC5',
    },

    surface: {
        sage: '#E8EEE7',
        peach: '#F6E8DF',
        cream: '#EEE9DF',
        danger: '#FBEDEA',
        glass: 'rgba(255,253,249,0.96)',
        veil: 'rgba(246,243,236,0.84)',
        scrim: 'rgba(32,43,37,0.48)',
        whiteMuted: 'rgba(255,255,255,0.78)',
        transparent: 'transparent',
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
        regular: Platform.OS === 'web' ? 'Arial, "Yu Gothic UI", Meiryo, sans-serif' : Platform.OS === 'android' ? 'sans-serif' : 'System',
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
    h3: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    body2: {
        fontSize: 14,
        fontWeight: 'normal',
    },
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 14,
    lg: 22,
    xl: 28,
    round: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#29473C',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    md: {
        shadowColor: '#29473C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#29473C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
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
