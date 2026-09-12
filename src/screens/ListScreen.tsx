import { AppText as Text } from '../components/AppText';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Transaction, TransactionType } from '../types';
import { getAllTransactions, markTransactionComplete, removeTransactions, revertTransactionStatus } from '../services/database';
import { cancelTransactionReminders, scheduleTransactionReminders } from '../services/notifications';
import { AlertButton, CustomAlertModal } from '../components/CustomAlertModal';
import { CatEmpty } from '../components/Brand';
import { TransactionRow } from '../components/TransactionRow';
import { borderRadius, colors, spacing } from '../styles/theme';
import type { RootStackParamList } from '../../App';

type Filter = 'all' | TransactionType;
const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'すべて' }, { value: 'lent', label: '貸した' }, { value: 'borrowed', label: '借りた' },
];

export default function ListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [filter, setFilter] = useState<Filter>('all');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [selecting, setSelecting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [loadError, setLoadError] = useState(false);
    const [notice, setNotice] = useState('');
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; buttons: AlertButton[] }>({ visible: false, title: '', message: '', buttons: [] });
    const closeAlert = () => setAlert(prev => ({ ...prev, visible: false }));
    const showError = (title: string, message: string) => setAlert({ visible: true, title, message, buttons: [{ text: '確認', onPress: closeAlert }] });

    const loadData = useCallback(async () => {
        try {
            const data = await getAllTransactions();
            setTransactions(data);
            setSelected(prev => new Set([...prev].filter(id => data.some(t => t.id === id))));
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void loadData();
        return () => { setSelecting(false); setSelected(new Set()); };
    }, [loadData]));

    const visible = transactions.filter(t => filter === 'all' || t.type === filter);
    const allSelected = visible.length > 0 && visible.every(t => selected.has(t.id));

    const toggle = (id: string) => {
        if (busyRef.current) return;
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const deleteSelected = (ids: string[]) => {
        if (!ids.length || busyRef.current) return;
        const targets = [...ids]; // Freeze the exact reviewed selection, including completed records.
        setAlert({
            visible: true,
            title: targets.length + '件の取引を削除しますか？',
            message: '選択した取引だけを削除します。\nこの操作は取り消せません。必要な記録は先にバックアップしてください。',
            buttons: [
                { text: 'キャンセル', style: 'cancel', onPress: closeAlert },
                { text: targets.length + '件を削除', style: 'destructive', onPress: async () => {
                    if (busyRef.current) return;
                    busyRef.current = true;
                    setBusy(true);
                    closeAlert();
                    try {
                        const result = await removeTransactions(targets);
                        const removed = new Set(targets);
                        setTransactions(prev => prev.filter(t => !removed.has(t.id)));
                        setSelected(new Set());
                        setSelecting(false);
                        setNotice(targets.length + '件の取引を削除しました');
                        if (result.reminderCleanupFailed) {
                            showError('取引を削除しました', '一部の通知を解除できませんでした。次回起動時に再試行します。');
                        }
                    } catch {
                        showError('削除できませんでした', '取引は削除されていません。保存先を確認して、もう一度お試しください。');
                    } finally {
                        busyRef.current = false;
                        setBusy(false);
                    }
                } },
            ],
        });
    };

    const changeStatus = (t: Transaction) => {
        const complete = t.status !== 'completed';
        setAlert({
            visible: true, title: complete ? '精算完了' : '精算取消',
            message: complete ? t.counterparty + 'さんとの取引を精算済みにしますか？' : '未精算の状態に戻しますか？',
            buttons: [
                { text: 'キャンセル', style: 'cancel', onPress: closeAlert },
                { text: complete ? '完了にする' : '戻す', onPress: async () => {
                    if (busyRef.current) return;
                    busyRef.current = true; setBusy(true); closeAlert();
                    try {
                        if (complete) {
                            await markTransactionComplete(t.id);
                            await cancelTransactionReminders(t.id);
                        } else {
                            await revertTransactionStatus(t.id);
                            if (t.dueDate) await scheduleTransactionReminders(t.id, t.counterparty, t.amount, new Date(t.dueDate + 'T00:00:00'), t.type);
                        }
                        await loadData();
                        setNotice(complete ? '精算済みにしました' : '未精算に戻しました');
                    } catch { showError('処理できませんでした', 'もう一度お試しください。'); }
                    finally { busyRef.current = false; setBusy(false); }
                } },
            ],
        });
    };

    const showActions = (t: Transaction) => setAlert({
        visible: true, title: t.counterparty, message: '取引の操作を選んでください。',
        buttons: [
            { text: t.status === 'completed' ? '精算を取り消す' : '精算を完了する', onPress: () => changeStatus(t) },
            { text: '編集する', onPress: () => { closeAlert(); navigation.navigate('Edit', { transactionId: t.id }); } },
            { text: '削除する', style: 'destructive', onPress: () => deleteSelected([t.id]) },
            { text: '閉じる', style: 'cancel', onPress: closeAlert },
        ],
    });

    const renderRow = ({ item }: { item: Transaction }) => {
        const row = <TransactionRow transaction={item} selecting={selecting} selected={selected.has(item.id)} disabled={busy}
            onPress={() => selecting ? toggle(item.id) : navigation.navigate('Detail', { transactionId: item.id })}
            onMore={() => showActions(item)} />;
        if (selecting) return row;
        return <Swipeable enabled={!busy} overshootRight={false} renderRightActions={() => <View style={styles.swipeActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.counterparty + 'の精算状態を変更'} style={styles.swipeButton} onPress={() => changeStatus(item)} disabled={busy}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={item.status === 'completed' ? 'refresh' : 'checkmark'} color={colors.neutral.white} size={22} />
                <Text style={styles.swipeText}>{item.status === 'completed' ? '戻す' : '完了'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.counterparty + 'を編集'} style={styles.swipeButton} onPress={() => navigation.navigate('Edit', { transactionId: item.id })} disabled={busy}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="create-outline" color={colors.neutral.white} size={21} /><Text style={styles.swipeText}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.counterparty + 'を削除'} style={[styles.swipeButton, styles.swipeDelete]} onPress={() => deleteSelected([item.id])} disabled={busy}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="trash-outline" color={colors.neutral.white} size={21} /><Text style={styles.swipeText}>削除</Text>
            </TouchableOpacity>
        </View>}>{row}</Swipeable>;
    };

    return <View style={styles.container}>
        <View style={styles.top}>
            <View><Text style={styles.eyebrow}>YOUR RECORDS</Text><Text accessibilityRole="header" style={styles.title}>お金の記録</Text></View>
            <TouchableOpacity accessibilityRole="button" disabled={busy || loading || loadError || (!selecting && !visible.length)}
                accessibilityState={{ disabled: busy || loading || loadError || (!selecting && !visible.length) }}
                style={[styles.selectButton, (busy || loading || loadError || (!selecting && !visible.length)) && styles.disabled]}
                onPress={() => { setSelecting(!selecting); setSelected(new Set()); setNotice(''); }}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={selecting ? 'close-outline' : 'checkbox-outline'} size={17} color={colors.primary.main} />
                <Text style={styles.selectText}>{selecting ? 'キャンセル' : '選択'}</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.filters}>
            {filters.map(f => <TouchableOpacity accessibilityRole="tab" aria-selected={f.value === filter} accessibilityState={{ selected: f.value === filter, disabled: busy }} key={f.value} disabled={busy}
                onPress={() => { setFilter(f.value); setSelected(new Set()); setNotice(''); }}
                style={[styles.filter, filter === f.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === f.value && styles.filterActiveText]}>{f.label}</Text>
            </TouchableOpacity>)}
        </View>
        <View style={styles.toolbar}>
            <Text style={styles.meta}>{visible.length}件の記録{selecting ? ' · ' + selected.size + '件を選択中' : ''}</Text>
            {selecting && <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="表示中の取引をすべて選択" aria-checked={allSelected} accessibilityState={{ checked: allSelected, disabled: busy || !visible.length }} disabled={busy || !visible.length}
                style={styles.allButton} onPress={() => setSelected(allSelected ? new Set() : new Set(visible.map(t => t.id)))}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={allSelected ? 'checkbox' : 'square-outline'} size={18} color={colors.primary.main} />
                <Text style={styles.selectText}>{allSelected ? '選択を解除' : 'すべて選択'}</Text>
            </TouchableOpacity>}
        </View>
        {notice !== '' && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
        {loadError ? <View style={styles.error}>
            <Text style={styles.errorText}>記録を読み込めませんでした。保存先を確認してください。</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.selectButton} onPress={loadData}><Text style={styles.selectText}>再読み込み</Text></TouchableOpacity>
        </View> : loading ? <ActivityIndicator style={styles.loader} color={colors.primary.main} size="large" /> : <FlatList
            data={visible} renderItem={renderRow} keyExtractor={t => t.id} extraData={{ selected, selecting, busy }}
            contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl enabled={!busy} refreshing={refreshing} tintColor={colors.primary.main} onRefresh={async () => { if (busyRef.current) return; setRefreshing(true); await loadData(); setRefreshing(false); }} />}
            ListEmptyComponent={<CatEmpty title="記録はまだありません" description={filter === 'all' ? '小さな貸し借りも、ここに残しておこう。' : 'この種類の取引はありません。'} />}
        />}
        {selecting && <View style={styles.bulkBar}>
            <View style={styles.bulkDescription}><Text style={styles.bulkCount}>{selected.size}件を選択中</Text><Text style={styles.meta}>表示中の記録が対象です</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="選択した取引を削除" accessibilityState={{ disabled: !selected.size || busy }} disabled={!selected.size || busy}
                style={[styles.deleteButton, (!selected.size || busy) && styles.disabled]} onPress={() => deleteSelected([...selected])}>
                {busy ? <ActivityIndicator color={colors.neutral.white} /> : <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="trash-outline" size={18} color={colors.neutral.white} />}
                <Text style={styles.deleteText}>{busy ? '削除中…' : '選択した取引を削除'}</Text>
            </TouchableOpacity>
        </View>}
        <CustomAlertModal visible={alert.visible} title={alert.title} message={alert.message} buttons={alert.buttons} onDismiss={closeAlert} />
    </View>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral.background },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    eyebrow: { fontSize: 10, letterSpacing: 2, color: colors.primary.main, fontWeight: '700', marginBottom: spacing.sm },
    title: { fontSize: 27, fontWeight: '700', color: colors.neutral.textPrimary },
    selectButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: borderRadius.round, borderWidth: 1, borderColor: colors.neutral.border, backgroundColor: colors.neutral.card },
    selectText: { fontSize: 12, fontWeight: '600', color: colors.primary.main },
    filters: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface.cream, padding: spacing.xs, borderRadius: borderRadius.round },
    filter: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: borderRadius.round },
    filterActive: { backgroundColor: colors.primary.main },
    filterText: { color: colors.neutral.textSecondary, fontSize: 13, fontWeight: '600' },
    filterActiveText: { color: colors.neutral.white },
    toolbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, gap: spacing.xs },
    meta: { fontSize: 11, color: colors.neutral.textSecondary },
    allButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    loader: { marginTop: spacing.xxl },
    notice: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surface.sage, color: colors.primary.dark, fontSize: 13 },
    error: { padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
    errorText: { color: colors.semantic.error, fontSize: 14, lineHeight: 24 },
    bulkBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderColor: colors.neutral.border, backgroundColor: colors.neutral.card },
    bulkDescription: { flexGrow: 1, gap: spacing.xs },
    bulkCount: { fontSize: 14, fontWeight: '700', color: colors.neutral.textPrimary },
    deleteButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.round, backgroundColor: colors.semantic.error },
    deleteText: { color: colors.neutral.white, fontSize: 12, fontWeight: '600' },
    disabled: { opacity: 0.4 },
    swipeActions: { flexDirection: 'row', marginBottom: spacing.sm, paddingLeft: spacing.sm, gap: spacing.xs },
    swipeButton: { width: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary.main, borderRadius: borderRadius.md, gap: spacing.xs },
    swipeDelete: { backgroundColor: colors.semantic.error },
    swipeText: { fontSize: 11, color: colors.neutral.white },
});
