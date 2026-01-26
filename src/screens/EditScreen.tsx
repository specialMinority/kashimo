/**
 * Edit Screen - 거래 수정
 * 기존 거래 정보 수정 폼
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';
import { Transaction, TransactionType } from '../types';
import { getTransaction, updateTransaction } from '../services/database';
import { scheduleTransactionReminders, cancelTransactionReminders } from '../services/notifications';
import { CustomAlertModal } from '../components/CustomAlertModal';

// 네비게이션 타입
type RootStackParamList = {
    Main: undefined;
    Detail: { transactionId: string };
    Edit: { transactionId: string };
};

type EditScreenRouteProp = RouteProp<RootStackParamList, 'Edit'>;

export default function EditScreen() {
    const route = useRoute<EditScreenRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { transactionId } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [transaction, setTransaction] = useState<Transaction | null>(null);

    // 폼 상태
    const [counterparty, setCounterparty] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('lent');
    const [dueDate, setDueDate] = useState('');
    const [memo, setMemo] = useState('');

    // 기존 데이터 로드
    const loadTransaction = useCallback(async () => {
        try {
            const data = await getTransaction(transactionId);
            if (data) {
                setTransaction(data);
                setCounterparty(data.counterparty);
                setAmount(String(data.amount));
                setType(data.type);
                setDueDate(data.dueDate);
                setMemo(data.memo || '');
            }
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

    const showAlert = (title: string, message: string, buttons: any[] = [{ text: 'OK', onPress: closeAlert }]) => {
        setAlertConfig({ visible: true, title, message, buttons });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    // 저장 처리
    const handleSave = async () => {
        if (!transaction) return;

        // 유효성 검사
        if (!counterparty.trim()) {
            showAlert('エラー', '相手の名前を入力してください');
            return;
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            showAlert('エラー', '金額を正しく入力してください');
            return;
        }
        if (!dueDate) {
            showAlert('エラー', '返済期限を入力してください');
            return;
        }

        // 날짜 형식 유연화 (YYYYMMDD -> YYYY-MM-DD)
        let formattedDate = dueDate.trim();
        if (/^\d{8}$/.test(formattedDate)) {
            formattedDate = `${formattedDate.slice(0, 4)}-${formattedDate.slice(4, 6)}-${formattedDate.slice(6, 8)}`;
        }

        // 날짜 형식 검증 (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formattedDate)) {
            showAlert('エラー', '日付はYYYY-MM-DD、またはYYYYMMDD形式で入力してください');
            return;
        }

        setSaving(true);

        try {
            // 1. DB 업데이트
            await updateTransaction(transactionId, {
                counterparty: counterparty.trim(),
                amount: Number(amount),
                type,
                dueDate: formattedDate,
                memo: memo.trim() || undefined,
            });

            // 2. 알림 재설정 (기존 알림 취소 후 재생성)
            await cancelTransactionReminders(transactionId);
            await scheduleTransactionReminders(
                transactionId,
                counterparty.trim(),
                Number(amount),
                new Date(formattedDate),
                type
            );

            showAlert('完了', '修正しました', [
                {
                    text: '確認',
                    onPress: () => {
                        closeAlert();
                        navigation.goBack(); // Detail 화면으로 돌아감
                    }
                }
            ]);
        } catch (error) {
            console.error(error);
            showAlert('エラー', '保存に失敗しました');
        } finally {
            setSaving(false);
        }
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
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView style={styles.scrollView}>
                {saving && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color={colors.neutral.white} />
                    </View>
                )}

                <View style={styles.form}>
                    {/* 거래 유형 선택 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>取引タイプ</Text>
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === 'lent' && styles.typeButtonActive,
                                    type === 'lent' && { backgroundColor: colors.primary.main }
                                ]}
                                onPress={() => setType('lent')}
                            >
                                <Ionicons
                                    name="arrow-up-circle"
                                    size={20}
                                    color={type === 'lent' ? colors.neutral.white : colors.primary.main}
                                />
                                <Text style={[
                                    styles.typeButtonText,
                                    type === 'lent' && styles.typeButtonTextActive
                                ]}>
                                    貸した
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === 'borrowed' && styles.typeButtonActive,
                                    type === 'borrowed' && { backgroundColor: colors.accent.coral }
                                ]}
                                onPress={() => setType('borrowed')}
                            >
                                <Ionicons
                                    name="arrow-down-circle"
                                    size={20}
                                    color={type === 'borrowed' ? colors.neutral.white : colors.accent.coral}
                                />
                                <Text style={[
                                    styles.typeButtonText,
                                    type === 'borrowed' && styles.typeButtonTextActive
                                ]}>
                                    借りた
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 상대방 이름 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>相手の名前 *</Text>
                        <TextInput
                            style={styles.input}
                            value={counterparty}
                            onChangeText={setCounterparty}
                            placeholder="例: 田中太郎"
                            placeholderTextColor={colors.neutral.textTertiary}
                        />
                    </View>

                    {/* 금액 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>金額 *</Text>
                        <View style={styles.amountInputContainer}>
                            <Text style={styles.currencyPrefix}>¥</Text>
                            <TextInput
                                style={[styles.input, styles.amountInput]}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="50000"
                                placeholderTextColor={colors.neutral.textTertiary}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* 반환 기한 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>返済期限 *</Text>
                        <TextInput
                            style={styles.input}
                            value={dueDate}
                            onChangeText={setDueDate}
                            placeholder="2026-02-24"
                            placeholderTextColor={colors.neutral.textTertiary}
                        />
                        <Text style={styles.hint}>YYYY-MM-DD形式で入力</Text>
                    </View>

                    {/* 메모 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>メモ (任意)</Text>
                        <TextInput
                            style={[styles.input, styles.memoInput]}
                            value={memo}
                            onChangeText={setMemo}
                            placeholder="例: ランチ代、飲み会"
                            placeholderTextColor={colors.neutral.textTertiary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* 저장 버튼 */}
                    <TouchableOpacity
                        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Ionicons name="checkmark-circle" size={24} color={colors.neutral.white} />
                        <Text style={styles.submitButtonText}>
                            {saving ? '保存中...' : '変更を保存'}
                        </Text>
                    </TouchableOpacity>

                    {/* 취소 버튼 */}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={closeAlert}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral.background,
    },
    scrollView: {
        flex: 1,
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
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    form: {
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        color: colors.neutral.textPrimary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.neutral.card,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.neutral.border,
        padding: spacing.md,
        fontSize: typography.fontSize.md,
        color: colors.neutral.textPrimary,
    },
    hint: {
        fontSize: typography.fontSize.xs,
        color: colors.neutral.textTertiary,
        marginTop: spacing.xs,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.neutral.border,
        backgroundColor: colors.neutral.card,
    },
    typeButtonActive: {
        borderColor: 'transparent',
    },
    typeButtonText: {
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        color: colors.neutral.textSecondary,
    },
    typeButtonTextActive: {
        color: colors.neutral.white,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyPrefix: {
        fontSize: typography.fontSize.xl,
        fontWeight: 'bold',
        color: colors.neutral.textPrimary,
        marginRight: spacing.sm,
    },
    amountInput: {
        flex: 1,
        fontSize: typography.fontSize.xl,
        fontWeight: 'bold',
    },
    memoInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary.main,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        ...shadows.md,
        marginTop: spacing.lg,
    },
    submitButtonDisabled: {
        backgroundColor: colors.neutral.disabled,
    },
    submitButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.neutral.white,
    },
    cancelButton: {
        alignItems: 'center',
        padding: spacing.md,
        marginTop: spacing.md,
    },
    cancelButtonText: {
        fontSize: typography.fontSize.md,
        color: colors.neutral.textSecondary,
    },
});
