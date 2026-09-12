import { AppText as Text } from '../components/AppText';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, formatCurrency } from '../styles/theme';
import { getDashboardSummary, markTransactionComplete } from '../services/database';
import { cancelTransactionReminders } from '../services/notifications';
import { CustomAlertModal, AlertButton } from '../components/CustomAlertModal';
import { CatEmpty, CatHero } from '../components/Brand';
import { TransactionRow } from '../components/TransactionRow';
import { Transaction, DashboardSummary } from '../types';
import { localDateKey } from '../utils/date';
import type { RootStackParamList } from '../../App';

const EMPTY: DashboardSummary = { totalToReceive: 0, totalToPay: 0, receiveCount: 0, payCount: 0, upcomingTransactions: [] };

export default function HomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [summary, setSummary] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; buttons: AlertButton[] }>({ visible: false, title: '', message: '', buttons: [] });
    const close = () => setAlert(a => ({ ...a, visible: false }));
    const load = useCallback(async () => {
        try { setSummary(await getDashboardSummary()); setError(false); }
        catch { setError(true); }
        finally { setLoading(false); }
    }, []);
    useFocusEffect(useCallback(() => { void load(); }, [load]));
    const goAdd = () => navigation.navigate('Main', { screen: 'Add' });
    const goList = () => navigation.navigate('Main', { screen: 'List' });
    const dueToday = summary.upcomingTransactions.filter(t => t.dueDate === localDateKey()).length;

    const complete = (t: Transaction) => setAlert({
        visible: true, title: '精算完了', message: t.counterparty + 'さんとの取引を精算済みにしますか？',
        buttons: [
            { text: 'キャンセル', style: 'cancel', onPress: close },
            { text: '完了にする', onPress: async () => {
                close(); setBusy(true);
                try { await markTransactionComplete(t.id); await cancelTransactionReminders(t.id); await load(); }
                catch { setAlert({ visible: true, title: '処理できませんでした', message: 'もう一度お試しください。', buttons: [{ text: '確認', onPress: close }] }); }
                finally { setBusy(false); }
            } },
        ],
    });

    return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary.main} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <CatHero onAdd={goAdd} />
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>いまの貸し借り</Text><Text style={styles.small}>未精算の記録</Text></View>
        {loading ? <ActivityIndicator color={colors.primary.main} style={styles.loading} /> : error ? <TouchableOpacity accessibilityRole="button" onPress={load} style={styles.error}><Text style={styles.errorText}>記録を読み込めませんでした。タップして再試行</Text></TouchableOpacity> : <View style={styles.summary}>
            <View style={[styles.card, styles.receive]}>
                <View style={styles.cardLabel}><Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="arrow-down-circle-outline" size={21} color={colors.neutral.white} /><Text style={styles.receiveLabel}>受け取る予定</Text></View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, styles.receiveAmount]}>{formatCurrency(summary.totalToReceive)}</Text>
                <Text style={styles.receiveCount}>{summary.receiveCount}件の貸したお金</Text>
            </View>
            <View style={[styles.card, styles.pay]}>
                <View style={styles.cardLabel}><Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="arrow-up-circle-outline" size={21} color={colors.money.pay} /><Text style={styles.payLabel}>返す予定</Text></View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, styles.payAmount]}>{formatCurrency(summary.totalToPay)}</Text>
                <Text style={styles.payCount}>{summary.payCount}件の借りたお金</Text>
            </View>
        </View>}
        {dueToday > 0 && <TouchableOpacity accessibilityRole="button" onPress={goList} style={styles.reminder}>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="notifications-outline" color={colors.accent.coral} size={19} />
            <Text style={styles.reminderText}>今日が期限の取引が{dueToday}件あります</Text>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="chevron-forward" color={colors.accent.coral} size={16} />
        </TouchableOpacity>}
        <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>今週の予定</Text><Text style={styles.small}>今日から7日先まで</Text></View>
            <TouchableOpacity accessibilityRole="button" onPress={goList} style={styles.viewAll}><Text style={styles.viewAllText}>すべて見る</Text><Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="arrow-forward" color={colors.primary.main} size={17} /></TouchableOpacity>
        </View>
        {!loading && !error && (summary.upcomingTransactions.length ? summary.upcomingTransactions.map(t =>
            <Swipeable key={t.id} enabled={!busy} overshootRight={false} renderRightActions={() => <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.counterparty + 'の精算を完了'} onPress={() => complete(t)} disabled={busy} style={styles.swipe}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="checkmark" size={23} color={colors.neutral.white} /><Text style={styles.swipeText}>完了</Text>
            </TouchableOpacity>}>
                <TransactionRow transaction={t} disabled={busy} onPress={() => navigation.navigate('Detail', { transactionId: t.id })} />
            </Swipeable>) : <CatEmpty title="今週は、のんびりいこう。" description="これから7日間の返済予定はありません。" onAdd={summary.receiveCount + summary.payCount === 0 ? goAdd : undefined} />)}
        {Platform.OS === 'web' && <View style={styles.install}>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="phone-portrait-outline" color={colors.primary.main} size={21} />
            <View style={styles.installCopy}><Text style={styles.installTitle}>いつも、ホーム画面に。</Text><Text style={styles.installText}>iPhoneのSafariで「共有」→「ホーム画面に追加」。{ '\n' }一度読み込めば、オフラインでも記録できます。</Text></View>
        </View>}
        <Text style={styles.footer}>あなたの記録を、カシモがそっとお手伝い。</Text>
        <CustomAlertModal visible={alert.visible} title={alert.title} message={alert.message} buttons={alert.buttons} onDismiss={close} />
    </ScrollView>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.neutral.textPrimary },
    small: { fontSize: 10, color: colors.neutral.textSecondary, marginTop: spacing.xs },
    summary: { flexDirection: 'row', gap: spacing.sm },
    card: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, minHeight: 140, justifyContent: 'space-between' },
    receive: { backgroundColor: colors.primary.main },
    pay: { backgroundColor: colors.surface.peach },
    cardLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    receiveLabel: { color: colors.neutral.white, fontSize: 11, fontWeight: '500' },
    payLabel: { color: colors.money.pay, fontSize: 11, fontWeight: '500' },
    amount: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], marginVertical: spacing.md, letterSpacing: -0.8 },
    receiveAmount: { color: colors.neutral.white },
    payAmount: { color: colors.money.pay },
    receiveCount: { color: colors.surface.whiteMuted, fontSize: 10 },
    payCount: { color: colors.accent.coralDark, fontSize: 10 },
    viewAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
    viewAllText: { fontSize: 12, color: colors.primary.main, fontWeight: '600' },
    reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surface.peach },
    reminderText: { flex: 1, color: colors.accent.coralDark, fontSize: 12 },
    install: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.lg, marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.neutral.border },
    installCopy: { flex: 1 },
    installTitle: { fontSize: 13, fontWeight: '600', color: colors.neutral.textPrimary, marginBottom: spacing.xs },
    installText: { fontSize: 11, lineHeight: 20, color: colors.neutral.textSecondary },
    footer: { fontSize: 10, textAlign: 'center', color: colors.neutral.textTertiary, paddingTop: spacing.lg },
    loading: { padding: spacing.lg },
    error: { padding: spacing.md, backgroundColor: colors.surface.danger, borderRadius: borderRadius.md },
    errorText: { fontSize: 12, color: colors.semantic.error },
    swipe: { width: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary.main, borderRadius: borderRadius.md, marginBottom: spacing.sm, marginLeft: spacing.sm, gap: spacing.xs },
    swipeText: { color: colors.neutral.white, fontSize: 12 },
});
