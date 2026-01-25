/**
 * Home Screen - 대시보드
 * 받을 돈/갚을 돈 합계 및 이번 주 예정 거래 표시
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { colors, spacing, borderRadius, shadows, typography, formatCurrency, getDDay } from '../styles/theme';
import { getDashboardSummary, markTransactionComplete } from '../services/database';
import { cancelTransactionReminders } from '../services/notifications';

// ...

// 초기 빈 상태
const EMPTY_SUMMARY: DashboardSummary = {
    totalToReceive: 0,
    totalToPay: 0,
    receiveCount: 0,
    payCount: 0,
    upcomingTransactions: [],
};

export default function HomeScreen() {
    const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // 🔥 Firestore에서 거래 데이터 로드
    const loadData = useCallback(async () => {
        try {
            const data = await getDashboardSummary();
            setSummary(data);
            console.log('✅ Dashboard loaded:', data);
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 🔄 탭 포커스 시 데이터 새로고침
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
        );
    }

    const handleSwipeComplete = async (transaction: Transaction) => {
        Alert.alert(
            '精算完了',
            `${transaction.counterparty}さんとの取引を精算済みにしますか？`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '完了にする',
                    onPress: async () => {
                        try {
                            await markTransactionComplete(transaction.id);
                            await cancelTransactionReminders(transaction.id);
                            // 목록에서 제거 (낙관적 업데이트)
                            setSummary(prev => ({
                                ...prev,
                                upcomingTransactions: prev.upcomingTransactions.filter(t => t.id !== transaction.id)
                            }));
                            Alert.alert('完了', '精算完了しました');
                            loadData(); // 데이터 최신화
                        } catch (error) {
                            Alert.alert('エラー', '処理に失敗しました');
                        }
                    }
                }
            ]
        );
    };

    const renderRightActions = (progress: any, dragX: any, item: Transaction) => {
        return (
            <TouchableOpacity
                style={styles.completeAction}
                onPress={() => handleSwipeComplete(item)}
            >
                <Ionicons name="checkmark-circle" size={24} color={colors.neutral.white} />
                <Text style={styles.actionText}>完了</Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* 요약 카드들 */}
            <View style={styles.summaryContainer}>
                {/* 받을 돈 카드 */}
                <View style={[styles.summaryCard, styles.receiveCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="arrow-down-circle" size={24} color={colors.primary.main} />
                        <Text style={styles.cardLabel}>受け取る予定</Text>
                    </View>
                    <Text style={[styles.cardAmount, { color: colors.primary.main }]}>
                        {formatCurrency(summary.totalToReceive)}
                    </Text>
                    <Text style={styles.cardCount}>{summary.receiveCount}人から</Text>
                </View>

                {/* 갚을 돈 카드 */}
                <View style={[styles.summaryCard, styles.payCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="arrow-up-circle" size={24} color={colors.accent.coral} />
                        <Text style={styles.cardLabel}>返す予定</Text>
                    </View>
                    <Text style={[styles.cardAmount, { color: colors.accent.coral }]}>
                        {formatCurrency(summary.totalToPay)}
                    </Text>
                    <Text style={styles.cardCount}>{summary.payCount}人に</Text>
                </View>
            </View>

            {/* 이번 주 예정 거래 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>今週の予定 (スワイプで完了)</Text>
                {summary.upcomingTransactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>予定された取引はありません</Text>
                    </View>
                ) : (
                    summary.upcomingTransactions.map((item) => (
                        <Swipeable
                            key={item.id}
                            renderRightActions={(p, d) => renderRightActions(p, d, item)}
                        >
                            <View style={styles.transactionItem}>
                                <View style={styles.transactionLeft}>
                                    <Text style={styles.dDayBadge}>{getDDay(item.dueDate as any)}</Text>
                                    <View>
                                        <Text style={styles.transactionTitle}>{item.counterparty}</Text>
                                        <View style={styles.transactionMeta}>
                                            <Text style={styles.transactionDate}>{item.dueDate}</Text>
                                            <Text style={styles.transactionType}>
                                                {item.type === 'lent' ? '貸した' : '借りた'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={[
                                    styles.transactionAmount,
                                    { color: item.type === 'lent' ? colors.primary.main : colors.accent.coral }
                                ]}>
                                    {formatCurrency(item.amount)}
                                </Text>
                            </View>
                        </Swipeable>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.sm,
        color: colors.neutral.textSecondary,
        ...typography.body2,
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.md,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.neutral.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    receiveCard: {
        borderTopWidth: 4,
        borderTopColor: colors.primary.main,
    },
    payCard: {
        borderTopWidth: 4,
        borderTopColor: colors.accent.coral,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    cardLabel: {
        ...typography.caption,
        color: colors.neutral.textSecondary,
        fontWeight: 'bold',
    },
    cardAmount: {
        ...typography.h3,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    cardCount: {
        ...typography.caption,
        color: colors.neutral.textTertiary,
        textAlign: 'right',
    },
    section: {
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.subtitle1,
        color: colors.neutral.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        borderRadius: borderRadius.md,
    },
    emptyText: {
        color: colors.neutral.textTertiary,
        ...typography.body2,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dDayBadge: {
        backgroundColor: colors.primary.light,
        color: colors.primary.dark,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: borderRadius.sm,
        fontSize: 12,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    transactionTitle: {
        ...typography.body1,
        fontWeight: '500',
        color: colors.neutral.textPrimary,
    },
    transactionMeta: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    transactionDate: {
        ...typography.caption,
        color: colors.neutral.textTertiary,
    },
    transactionType: {
        ...typography.caption,
        color: colors.neutral.textSecondary,
    },
    transactionAmount: {
        ...typography.subtitle1,
        fontWeight: 'bold',
    },
    completeAction: {
        backgroundColor: colors.semantic.success,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        marginLeft: spacing.sm,
    },
    actionText: {
        color: colors.neutral.white,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
    },
});
