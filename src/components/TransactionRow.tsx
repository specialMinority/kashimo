import { AppText as Text } from './AppText';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Transaction } from '../types';
import { colors, borderRadius, spacing, formatCurrency, getDDay } from '../styles/theme';
import { isOverdueDate } from '../utils/date';

interface Props {
    transaction: Transaction;
    onPress: () => void;
    onMore?: () => void;
    selecting?: boolean;
    selected?: boolean;
    disabled?: boolean;
}

export function TransactionRow({ transaction: t, onPress, onMore, selecting = false, selected = false, disabled = false }: Props) {
    const completed = t.status === 'completed';
    const overdue = !completed && isOverdueDate(t.dueDate);
    const lent = t.type === 'lent';
    const status = completed ? '精算済み' : overdue ? '期限超過' : t.dueDate ? getDDay(new Date(`${t.dueDate}T00:00:00`)) : '期限なし';
    return <View style={[styles.row, selected && styles.selected]}>
        <TouchableOpacity
            accessibilityRole={selecting ? 'checkbox' : 'button'}
            accessibilityLabel={selecting ? `${t.counterparty}の取引を選択` : `${t.counterparty} ${formatCurrency(t.amount)} ${completed ? '精算済み' : '未精算'} 詳細を開く`}
            accessibilityState={selecting ? { checked: selected, disabled } : { disabled }}
            aria-checked={selecting ? selected : undefined}
            disabled={disabled}
            onPress={onPress}
            activeOpacity={0.75}
            style={styles.main}
        >
            <View style={[styles.symbol, { backgroundColor: selecting ? colors.surface.transparent : lent ? colors.surface.sage : colors.surface.peach }]}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={selecting ? selected ? 'checkbox' : 'square-outline' : lent ? 'arrow-down' : 'arrow-up'} size={selecting ? 25 : 21} color={selecting ? colors.primary.main : lent ? colors.money.receive : colors.money.pay} />
            </View>
            <View style={styles.details}>
                <Text numberOfLines={1} style={styles.name}>{t.counterparty}</Text>
                <Text numberOfLines={1} style={styles.meta}>{lent ? '貸した' : '借りた'}{t.memo ? ` · ${t.memo}` : ''}</Text>
                {t.dueDate && <Text style={styles.date}>{t.dueDate.replace(/-/g, '.')}</Text>}
            </View>
            <View style={styles.end}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: completed ? colors.neutral.textSecondary : lent ? colors.money.receive : colors.money.pay }]}>{formatCurrency(t.amount)}</Text>
                <Text style={[styles.status, overdue && styles.overdue]}>{status}</Text>
            </View>
        </TouchableOpacity>
        {!selecting && onMore && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t.counterparty}の操作`} onPress={onMore} disabled={disabled} style={styles.more}>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="ellipsis-vertical" size={18} color={colors.neutral.textSecondary} />
        </TouchableOpacity>}
    </View>;
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.neutral.border, marginBottom: spacing.sm, minHeight: 90 },
    selected: { backgroundColor: colors.surface.sage, borderColor: colors.primary.main },
    main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
    symbol: { width: 34, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    details: { flex: 1, minWidth: 0, gap: spacing.xs },
    name: { fontSize: 14, fontWeight: '600', color: colors.neutral.textPrimary },
    meta: { fontSize: 11, color: colors.neutral.textSecondary },
    date: { fontSize: 10, color: colors.neutral.textTertiary },
    end: { alignItems: 'flex-end', maxWidth: '42%', gap: spacing.xs },
    amount: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
    status: { fontSize: 10, color: colors.neutral.textSecondary },
    overdue: { color: colors.semantic.error },
    more: { width: 36, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
