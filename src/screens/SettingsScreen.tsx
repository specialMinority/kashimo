/**
 * Settings Screen
 * 알림 설정, 앱 정보 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Linking,
    // Switch 제거 (Android Crash 방지)
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
    getNotificationSettings,
    saveNotificationSettings,
    requestNotificationPermissions,
    sendTestNotification
} from '../services/notifications';
import { exportData, importData } from '../services/backup';

// 렌더링 에러 방지를 위한 Custom Toggle Component
const CustomSwitch = ({ value, onValueChange }: { value: boolean, onValueChange: (val: boolean) => void }) => {
    return (
        <TouchableOpacity
            onPress={() => onValueChange(!value)}
            activeOpacity={0.8}
            style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: value ? colors.primary.main : colors.neutral.disabled,
                padding: 2,
                justifyContent: 'center',
            }}
        >
            <View style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: 'white',
                alignSelf: value ? 'flex-end' : 'flex-start',
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1.41,
                elevation: 2,
            }} />
        </TouchableOpacity>
    );
};

export default function SettingsScreen() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderDays, setReminderDays] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    // 설정 로드
    const loadSettings = async () => {
        try {
            const settings = await getNotificationSettings();
            console.log('Load settings:', settings);
            setNotificationsEnabled(!!settings.enabled);
            setReminderDays(settings.reminderDays || []);
        } catch (error) {
            console.error('Settings load error:', error);
        }
    };

    // 화면 포커스 시 설정 새로고침
    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    // 알림 토글 핸들러
    const handleNotificationsToggle = async (value: boolean) => {
        // ON으로 변경 시 권한 체크
        if (value) {
            const hasPermission = await requestNotificationPermissions();
            if (!hasPermission) {
                Alert.alert(
                    '通知権限が必要です',
                    '設定アプリから通知を許可してください',
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        setNotificationsEnabled(value);
        await saveNotificationSettings({
            enabled: value,
            reminderDays
        });
    };

    // 리마인더 일자 변경 핸들러
    const handleDayToggle = async (day: number) => {
        const newDays = reminderDays.includes(day)
            ? reminderDays.filter(d => d !== day)
            : [...reminderDays, day].sort((a, b) => a - b);

        setReminderDays(newDays);
        await saveNotificationSettings({
            enabled: notificationsEnabled,
            reminderDays: newDays
        });
    };

    // 테스트 알림 전송
    const handleTestNotification = async () => {
        setLoading(true);
        try {
            await sendTestNotification();
            Alert.alert('送信完了', '5秒後に通知が届きます');
        } catch (error) {
            Alert.alert('エラー', '通知の送信に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* 알림 설정 섹션 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>通知設定</Text>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name="notifications-outline" size={24} color={colors.primary.main} />
                            <Text style={styles.label}>返済リマインダー</Text>
                        </View>
                        <CustomSwitch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationsToggle}
                        />
                    </View>

                    {notificationsEnabled && (
                        <View style={styles.daysContainer}>
                            <Text style={styles.subLabel}>通知タイミング</Text>
                            <View style={styles.daysRow}>
                                {[1, 3, 7].map((day) => (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayButton,
                                            reminderDays.includes(day) && styles.dayButtonActive
                                        ]}
                                        onPress={() => handleDayToggle(day)}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            reminderDays.includes(day) && styles.dayTextActive
                                        ]}>
                                            {day}日前
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.testButton}
                        onPress={handleTestNotification}
                        disabled={loading}
                    >
                        <Text style={styles.testButtonText}>
                            {loading ? '送信中...' : 'テスト通知を送信'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 데이터 관리 섹션 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>データ管理</Text>

                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={exportData}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary.main} />
                            <Text style={styles.settingLabel}>データバックアップ</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.neutral.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={importData}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="cloud-download-outline" size={24} color={colors.primary.main} />
                            <Text style={styles.settingLabel}>データを復元</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.neutral.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 앱 정보 섹션 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>アプリ情報</Text>

                <View style={styles.card}>
                    <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.neutral.border, paddingBottom: 15 }]}>
                        <Text style={styles.infoLabel}>バージョン</Text>
                        <Text style={styles.infoValue}>1.0.0</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.row, { paddingTop: 15 }]}
                        onPress={() => Linking.openURL('https://expo.dev')}
                    >
                        <Text style={styles.infoLabel}>開発者情報</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.neutral.textTertiary} />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral.background,
        padding: spacing.md,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.subtitle1,
        color: colors.neutral.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    card: {
        backgroundColor: colors.neutral.white,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...shadows.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    label: {
        ...typography.body1,
        fontWeight: '500',
        color: colors.neutral.textPrimary,
    },
    subLabel: {
        ...typography.caption,
        color: colors.neutral.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    daysContainer: {
        marginTop: spacing.sm,
    },
    daysRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dayButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: borderRadius.round,
        backgroundColor: colors.neutral.background,
        borderWidth: 1,
        borderColor: colors.neutral.border,
    },
    dayButtonActive: {
        backgroundColor: colors.primary.light,
        borderColor: colors.primary.main,
    },
    dayText: {
        ...typography.caption,
        color: colors.neutral.textSecondary,
    },
    dayTextActive: {
        color: colors.primary.dark,
        fontWeight: 'bold',
    },
    testButton: {
        marginTop: spacing.lg,
        padding: spacing.sm,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.neutral.border,
    },
    testButtonText: {
        ...typography.button,
        color: colors.primary.main,
    },
    infoLabel: {
        ...typography.body1,
        color: colors.neutral.textPrimary,
    },
    infoValue: {
        ...typography.body1,
        color: colors.neutral.textSecondary,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    settingLabel: {
        ...typography.body1,
        color: colors.neutral.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral.border,
        marginVertical: spacing.xs,
    },
});
