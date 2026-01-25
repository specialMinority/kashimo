/**
 * List Screen - 거래 목록
 * 모든 거래를 필터별로 표시
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { colors, spacing, borderRadius, shadows, typography, formatCurrency, getDDay } from '../styles/theme';
import { Transaction, TransactionType } from '../types';
import { TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '../constants';
import { getAllTransactions, removeTransaction, revertTransactionStatus } from '../services/database';
import { cancelTransactionReminders } from '../services/notifications';

// 네비게이션 타입
type RootStackParamList = {
    Main: undefined;
    Detail: { transactionId: string };
    Edit: { transactionId: string };
};

type FilterType = 'all' | 'lent' | 'borrowed';

export default function ListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [filter, setFilter] = useState<FilterType>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // 🔥 SQLite/Local DB에서 데이터 로드
    const loadData = useCallback(async () => {
        try {
            const data = await getAllTransactions();
            setTransactions(data);
            console.log('✅ Local Transactions loaded:', data.length, 'items');
        } catch (error) {
            console.error('❌ Failed to load transactions:', error);
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

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'all') return true;
        return t.type === filter;
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // 거래 클릭 시 상세 화면으로 이동
    const handleTransactionPress = (transactionId: string) => {
        navigation.navigate('Detail', { transactionId });
    };

    // 거래 삭제 처리
    const handleDelete = async (transaction: Transaction) => {
        Alert.alert(
            '削除確認',
            'この取引を削除しますか？\nこの操作は取り消せません。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除する',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelTransactionReminders(transaction.id);
                            await removeTransaction(transaction.id);
                            // 목록에서 제거
                            setTransactions(prev => prev.filter(t => t.id !== transaction.id));
                            Alert.alert('完了', '取引を削除しました');
                        } catch (error) {
                            Alert.alert('エラー', '削除に失敗しました');
                        }
                    }
                }
            ]
        );
    };

    // 거래 정산 취소 처리
    const handleRevert = async (transaction: Transaction) => {
        Alert.alert(
            '精算取消',
            '未精算状態に戻しますか？',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '戻す',
                    onPress: async () => {
                        try {
                            await revertTransactionStatus(transaction.id);
                            // 목록 업데이트 (낙관적 or reload)
                            await loadData();
                            Alert.alert('完了', '未精算状態に戻しました');
                        } catch (error) {
                            Alert.alert('エラー', '処理に失敗しました');
                        }
                    }
                }
            ]
        );
    };

    const renderRightActions = (progress: any, dragX: any, item: Transaction) => {
        const isCompleted = item.status === 'completed';

        if (isCompleted) {
            return (
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.revertAction]}
                        onPress={() => handleRevert(item)}
                    >
                        <Ionicons name="refresh-circle" size={24} color={colors.neutral.textSecondary} />
                        <Text style={[styles.actionText, { color: colors.neutral.textSecondary }]}>戻す</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteAction]}
                        onPress={() => handleDelete(item)}
                    >
                        <Ionicons name="trash-outline" size={24} color={colors.neutral.white} />
                        <Text style={styles.actionText}>削除</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editAction]}
                    onPress={() => navigation.navigate('Edit', { transactionId: item.id } as any)}
                >
                    <Ionicons name="create-outline" size={24} color={colors.neutral.white} />
                    <Text style={styles.actionText}>編集</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteAction]}
                    onPress={() => handleDelete(item)}
                >
                    <Ionicons name="trash-outline" size={24} color={colors.neutral.white} />
                    <Text style={styles.actionText}>削除</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const isCompleted = item.status === 'completed';
        const isOverdue = !isCompleted && new Date(item.dueDate) < new Date();

        return (
            <Swipeable
                renderRightActions={(p, d) => renderRightActions(p, d, item)}
                containerStyle={styles.swipeableContainer}
            >
                <TouchableOpacity
                    style={[
                        styles.transactionItem,
                        isCompleted && styles.completedItem
                    ]}
                    onPress={() => handleTransactionPress(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.transactionLeft}>
                        <View style={styles.nameRow}>
                            <Text style={[
                                styles.counterparty,
                                isCompleted && styles.completedText
                            ]}>
                                {item.counterparty}
                            </Text>
                            <View style={[
                                styles.typeBadge,
                                { backgroundColor: item.type === 'lent' ? colors.primary.light : colors.accent.coralLight }
                            ]}>
                                <Text style={styles.typeText}>
                                    {TRANSACTION_TYPE_LABELS[item.type]}
                                </Text>
                            </View>
                        </View>
                        {item.memo && (
                            <Text style={styles.memo}>{item.memo}</Text>
                        )}
                        <Text style={styles.date}>
                            期限: {new Date(item.dueDate).toLocaleDateString('ja-JP')}
                        </Text>
                    </View>

                    <View style={styles.transactionRight}>
                        <Text style={[
                            styles.amount,
                            { color: item.type === 'lent' ? colors.primary.main : colors.accent.coral },
                            isCompleted && styles.completedAmount
                        ]}>
                            {item.type === 'lent' ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>

                        {isCompleted ? (
                            <View style={[styles.statusBadge, { backgroundColor: colors.semantic.success }]}>
                                <Text style={styles.statusText}>{TRANSACTION_STATUS_LABELS.completed}</Text>
                            </View>
                        ) : isOverdue ? (
                            <View style={[styles.statusBadge, { backgroundColor: colors.semantic.error }]}>
                                <Text style={styles.statusText}>{TRANSACTION_STATUS_LABELS.overdue}</Text>
                            </View>
                        ) : (
                            <View style={[
                                styles.dDayBadge,
                                { backgroundColor: getDDayColor(item.dueDate) }
                            ]}>
                                <Text style={styles.dDayText}>{getDDay(new Date(item.dueDate))}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    return (
        <View style={styles.container}>
            {/* 필터 탭 */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.filterActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        すべて
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'lent' && styles.filterActive]}
                    onPress={() => setFilter('lent')}
                >
                    <Text style={[styles.filterText, filter === 'lent' && styles.filterTextActive]}>
                        貸した
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'borrowed' && styles.filterActive]}
                    onPress={() => setFilter('borrowed')}
                >
                    <Text style={[styles.filterText, filter === 'borrowed' && styles.filterTextActive]}>
                        借りた
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 거래 목록 */}
            <FlatList
                data={filteredTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color={colors.neutral.disabled} />
                        <Text style={styles.emptyText}>取引がありません</Text>
                    </View>
                }
            />
        </View>
    );
}

function getDDayColor(dueDate: string): string {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return colors.accent.coral;
    if (days <= 3) return colors.semantic.warning;
    return colors.primary.main;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral.background,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.neutral.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.border,
    },
    filterButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    filterActive: {
        backgroundColor: colors.primary.main,
    },
    filterText: {
        fontSize: typography.fontSize.md,
        color: colors.neutral.textSecondary,
        fontWeight: '500',
    },
    filterTextActive: {
        color: colors.neutral.white,
    },
    listContainer: {
        padding: spacing.md,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.neutral.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    completedItem: {
        opacity: 0.6,
    },
    transactionLeft: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    counterparty: {
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        color: colors.neutral.textPrimary,
    },
    completedText: {
        textDecorationLine: 'line-through',
    },
    typeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        fontSize: typography.fontSize.xs,
        color: colors.neutral.white,
        fontWeight: '500',
    },
    memo: {
        fontSize: typography.fontSize.sm,
        color: colors.neutral.textTertiary,
        marginTop: spacing.xs,
    },
    date: {
        fontSize: typography.fontSize.xs,
        color: colors.neutral.textTertiary,
        marginTop: spacing.xs,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
    },
    completedAmount: {
        textDecorationLine: 'line-through',
    },
    dDayBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginTop: spacing.xs,
    },
    dDayText: {
        fontSize: typography.fontSize.xs,
        color: colors.neutral.white,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginTop: spacing.xs,
    },
    statusText: {
        fontSize: typography.fontSize.xs,
        color: colors.neutral.white,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyText: {
        marginTop: spacing.md,
        color: colors.neutral.textTertiary,
    },
    swipeableContainer: {
        marginBottom: spacing.sm,
        ...shadows.sm,
        backgroundColor: colors.neutral.card,
        borderRadius: borderRadius.md,
    },
    actionContainer: {
        flexDirection: 'row',
        width: 140,
    },
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAction: {
        backgroundColor: colors.primary.main,
    },
    revertAction: {
        backgroundColor: colors.neutral.border,
    },
    deleteAction: {
        backgroundColor: colors.semantic.error,
        borderTopRightRadius: borderRadius.md,
        borderBottomRightRadius: borderRadius.md,
    },
    actionText: {
        color: colors.neutral.white,
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
});
