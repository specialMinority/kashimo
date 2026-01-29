/**
 * Add Screen - 거래 등록
 * 새 거래 입력 폼
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/theme';
import { TransactionType, CreateTransactionInput } from '../types';
import { TRANSACTION_TYPE_LABELS } from '../constants';
import { addTransaction } from '../services/database';
import { scheduleTransactionReminders } from '../services/notifications';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootTabParamList } from '../navigation/TabNavigator';
import { CustomAlertModal } from '../components/CustomAlertModal';

export default function AddScreen() {
    const [counterparty, setCounterparty] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('lent');
    const [dueDate, setDueDate] = useState('');
    const [memo, setMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Navigation
    const navigation = useNavigation<NativeStackNavigationProp<RootTabParamList>>();

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

    const handleSubmit = async () => {
        // 유효성 검사
        if (!counterparty.trim()) {
            showAlert('エラー', '相手の名前を入力してください');
            return;
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            showAlert('エラー', '金額を正しく入力してください');
            return;
        }
        // 납부기한이 입력된 경우에만 날짜 형식 검증
        if (dueDate.trim()) {
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
        }

        setIsSubmitting(true);

        try {
            const input: CreateTransactionInput = {
                counterparty: counterparty.trim(),
                amount: Number(amount),
                type,
                dueDate: dueDate.trim() ? (
                    /^\d{8}$/.test(dueDate.trim())
                        ? `${dueDate.trim().slice(0, 4)}-${dueDate.trim().slice(4, 6)}-${dueDate.trim().slice(6, 8)}`
                        : dueDate.trim()
                ) : undefined,
                memo: memo.trim() || undefined,
            };

            // 🔥 Local SQLite에 저장!
            const newTransaction = await addTransaction(input);
            console.log('✅ Transaction saved locally:', newTransaction);

            // 🔔 알림 스케줄링 (납부기한이 있을 때만)
            let scheduledIds: string[] = [];
            if (newTransaction.dueDate) {
                scheduledIds = await scheduleTransactionReminders(
                    newTransaction.id,
                    counterparty.trim(),
                    Number(amount),
                    new Date(newTransaction.dueDate),
                    type
                );
                console.log('🔔 Notifications scheduled:', scheduledIds.length, '개');
            } else {
                console.log('⚠️ 납부기한이 없어 알림을 스케줄링하지 않습니다');
            }

            showAlert(
                '完了',
                `取引を登録しました！\n${scheduledIds.length > 0 ? `リマインダー ${scheduledIds.length}件を設定しました。` : ''}`,
                [
                    {
                        text: '確認',
                        onPress: () => {
                            closeAlert();
                            // 폼 초기화
                            setCounterparty('');
                            setAmount('');
                            setType('lent');
                            setDueDate('');
                            setMemo('');
                            // 🚀 리스트 화면으로 이동
                            navigation.navigate('List');
                        },
                    },
                ]
            );
        } catch (error) {
            showAlert('エラー', '登録に失敗しました。\n' + String(error));
            console.error('❌ Save error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView style={styles.scrollView}>
                <View style={styles.form}>
                    {/* 거래 유형 선택 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>取引タイプ *</Text>
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
                            placeholder="例: 田中太郎"
                            placeholderTextColor={colors.neutral.textTertiary}
                            value={counterparty}
                            onChangeText={setCounterparty}
                        />
                    </View>

                    {/* 금액 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>金額 *</Text>
                        <View style={styles.amountInputContainer}>
                            <Text style={styles.currencyPrefix}>¥</Text>
                            <TextInput
                                style={[styles.input, styles.amountInput]}
                                placeholder="50000"
                                placeholderTextColor={colors.neutral.textTertiary}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* 반환 기한 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>返済期限 (任意)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-24"
                            placeholderTextColor={colors.neutral.textTertiary}
                            value={dueDate}
                            onChangeText={setDueDate}
                        />
                        <Text style={styles.hint}>YYYY-MM-DD形式で入力</Text>
                    </View>

                    {/* 메모 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>メモ (任意)</Text>
                        <TextInput
                            style={[styles.input, styles.memoInput]}
                            placeholder="例: ランチ代、飲み会"
                            placeholderTextColor={colors.neutral.textTertiary}
                            value={memo}
                            onChangeText={setMemo}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* 제출 버튼 */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitting && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Ionicons name="checkmark-circle" size={24} color={colors.neutral.white} />
                        <Text style={styles.submitButtonText}>
                            {isSubmitting ? '登録中...' : '登録する'}
                        </Text>
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
});
