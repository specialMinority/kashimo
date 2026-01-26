/**
 * Detail Screen - 거래 상세
 * 거래 정보 표시 및 수정/삭제/정산완료 기능
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows, typography, formatCurrency, getDDay } from '../styles/theme';
import { Transaction } from '../types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '../constants';
import { getTransaction, removeTransaction, markTransactionComplete, revertTransactionStatus } from '../services/database';
import { cancelTransactionReminders, scheduleTransactionReminders } from '../services/notifications';
import { CustomAlertModal } from '../components/CustomAlertModal';

// 네비게이션 타입
type RootStackParamList = {
    Main: undefined;
    Detail: { transactionId: string };
    Edit: { transactionId: string };
};

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

export default function DetailScreen() {
    const route = useRoute<DetailScreenRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { transactionId } = route.params;

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // 🔥 Firestore에서 거래 데이터 로드
    const loadTransaction = useCallback(async () => {
        try {
            const data = await getTransaction(transactionId);
            setTransaction(data);
            console.log('✅ Transaction loaded:', data);
        } catch (error) {
            console.error('❌ Failed to load transaction:', error);
            Alert.alert('エラー', '取引情報の読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => {
        loadTransaction();
    }, [loadTransaction]);

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message?: string;
        buttons: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[];
    }>({ visible: false, title: '', buttons: [] });

    const showAlert = (title: string, message: string, buttons: any[]) => {
        setAlertConfig({ visible: true, title, message, buttons });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    // 정산 완료 처리
    const handleComplete = async () => {
        showAlert(
            '精算完了',
            'この取引を精算済みにしますか？',
            [
                { text: 'キャンセル', style: 'cancel', onPress: closeAlert },
                {
                    text: '完了にする',
                    onPress: async () => {
                        closeAlert();
                        setActionLoading(true);
                        try {
                            await markTransactionComplete(transactionId);
                            // 🔔 정산 완료 시 남은 알림 취소
                            await cancelTransactionReminders(transactionId);
                            // Alert.alert('完了', '精算完了しました'); // Keep simple alert for success or use Toast later
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // 거래 삭제 처리
    const handleDelete = () => {
        showAlert(
            '削除確認',
            'この取引を削除しますか？\nこの操作は取り消せません。',
            [
                { text: 'キャンセル', style: 'cancel', onPress: closeAlert },
                {
                    text: '削除する',
                    style: 'destructive',
                    onPress: async () => {
                        closeAlert();
                        setActionLoading(true);
                        try {
                            // 🔔 삭제 시 관련 알림 취소
                            await cancelTransactionReminders(transactionId);
                            await removeTransaction(transactionId);
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
        );
    }

    if (!transaction) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.semantic.error} />
                <Text style={styles.errorText}>取引が見つかりません</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>戻る</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isCompleted = transaction.status === 'completed';
    const isOverdue = !isCompleted && new Date(transaction.dueDate) < new Date();
    const isLent = transaction.type === 'lent';

    // 정산 취소 처리 (미완료로 되돌리기)
    const handleRevert = async () => {
        showAlert(
            '精算取消',
            '未精算状態に戻しますか？',
            [
                { text: 'キャンセル', style: 'cancel', onPress: closeAlert },
                {
                    text: '戻す',
                    onPress: async () => {
                        closeAlert();
                        setActionLoading(true);
                        try {
                            await revertTransactionStatus(transactionId);
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {actionLoading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={colors.neutral.white} />
                </View>
            )}

            {/* 상태 배지 */}
            <View style={[
                styles.statusBanner,
                isCompleted ? styles.statusCompleted :
                    isOverdue ? styles.statusOverdue :
                        styles.statusPending
            ]}>
                <Text style={styles.statusText}>
                    {isCompleted ? '✅ 精算済み' :
                        isOverdue ? '⚠️ 期限超過' :
                            `📅 ${getDDay(new Date(transaction.dueDate))}`}
                </Text>
            </View>

            {/* 메인 정보 카드 */}
            <View style={styles.mainCard}>
                <View style={styles.typeRow}>
                    <View style={[
                        styles.typeBadge,
                        { backgroundColor: isLent ? colors.primary.light : colors.accent.coralLight }
                    ]}>
                        <Ionicons
                            name={isLent ? 'arrow-up-circle' : 'arrow-down-circle'}
                            size={16}
                            color={colors.neutral.white}
                        />
                        <Text style={styles.typeText}>
                            {TRANSACTION_TYPE_LABELS[transaction.type]}
                        </Text>
                    </View>
                </View>

                <Text style={styles.counterparty}>{transaction.counterparty}</Text>

                <Text style={[
                    styles.amount,
                    { color: isLent ? colors.primary.main : colors.accent.coral }
                ]}>
                    {isLent ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
            </View>

            {/* 상세 정보 */}
            <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>返済期限</Text>
                    <Text style={styles.detailValue}>
                        {new Date(transaction.dueDate).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>登録日</Text>
                    <Text style={styles.detailValue}>
                        {new Date(transaction.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </View>

                {transaction.memo && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>メモ</Text>
                        <Text style={styles.detailValue}>{transaction.memo}</Text>
                    </View>
                )}

                {transaction.completedAt && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>精算日</Text>
                        <Text style={[styles.detailValue, { color: colors.semantic.success }]}>
                            {new Date(transaction.completedAt).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>
                )}
            </View>

            {/* 액션 버튼들 */}
            <View style={styles.actionContainer}>
                {isCompleted ? (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.revertButton]}
                        onPress={handleRevert}
                    >
                        <Ionicons name="refresh-circle" size={24} color={colors.neutral.textSecondary} />
                        <Text style={[styles.actionButtonText, styles.revertButtonText]}>精算を取り消す</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={handleComplete}
                    >
                        <Ionicons name="checkmark-circle" size={24} color={colors.neutral.white} />
                        <Text style={styles.actionButtonText}>精算完了</Text>
                    </TouchableOpacity>
                )}
            </View>

            {!isCompleted && (
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => navigation.navigate('Edit', { transactionId })}
                    >
                        <Ionicons name="create-outline" size={24} color={colors.neutral.white} />
                        <Text style={styles.actionButtonText}>編集</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <Ionicons name="trash-outline" size={24} color={colors.neutral.white} />
                    <Text style={styles.actionButtonText}>削除</Text>
                </TouchableOpacity>
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={closeAlert}
            />
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
        marginTop: spacing.md,
        color: colors.neutral.textSecondary,
        fontSize: typography.fontSize.md,
    },
    errorText: {
        marginTop: spacing.md,
        color: colors.semantic.error,
        fontSize: typography.fontSize.md,
    },
    backButton: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.primary.main,
        borderRadius: borderRadius.md,
    },
    backButtonText: {
        color: colors.neutral.white,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    statusBanner: {
        padding: spacing.md,
        alignItems: 'center',
    },
    statusCompleted: {
        backgroundColor: colors.semantic.success,
    },
    statusOverdue: {
        backgroundColor: colors.semantic.error,
    },
    statusPending: {
        backgroundColor: colors.primary.main,
    },
    statusText: {
        color: colors.neutral.white,
        fontSize: typography.fontSize.md,
        fontWeight: 'bold',
    },
    mainCard: {
        backgroundColor: colors.neutral.card,
        margin: spacing.md,
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        ...shadows.md,
    },
    typeRow: {
        marginBottom: spacing.md,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
    },
    typeText: {
        color: colors.neutral.white,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    counterparty: {
        fontSize: typography.fontSize.xxl,
        fontWeight: 'bold',
        color: colors.neutral.textPrimary,
        marginBottom: spacing.sm,
    },
    amount: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    detailCard: {
        backgroundColor: colors.neutral.card,
        margin: spacing.md,
        marginTop: 0,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.border,
    },
    detailLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.neutral.textSecondary,
    },
    detailValue: {
        fontSize: typography.fontSize.md,
        color: colors.neutral.textPrimary,
        fontWeight: '500',
    },
    actionContainer: {
        padding: spacing.md,
        paddingTop: 0,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    revertButton: {
        backgroundColor: colors.neutral.border,
        borderWidth: 1,
        borderColor: colors.neutral.textSecondary,
    },
    revertButtonText: {
        color: colors.neutral.textSecondary,
    },
    completeButton: {
        backgroundColor: colors.semantic.success,
    },
    editButton: {
        backgroundColor: colors.primary.main,
    },
    deleteButton: {
        backgroundColor: colors.semantic.error,
    },
    actionButtonText: {
        color: colors.neutral.white,
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
    },
});
