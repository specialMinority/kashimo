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
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import {
    getNotificationSettings,
    saveNotificationSettings,
    requestNotificationPermissions,
    sendTestNotification
} from '../services/notifications';
import { exportData, importData } from '../services/backup';
import { GOOGLE_CONFIG, getGoogleUserInfo, findBackupFile, uploadBackupToDrive, downloadBackupFromDrive } from '../services/googleDrive';
import { getAllTransactions, replaceAllTransactions } from '../services/database';

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
    const [cloudLoading, setCloudLoading] = useState(false);

    // 구글 로그인 상태
    const [user, setUser] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // 구글 OAuth 요청 세팅
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GOOGLE_CONFIG.androidClientId,
        webClientId: GOOGLE_CONFIG.webClientId,
        // Web PWA의 경우 명시적인 Redirect URI가 권장됩니다.
        redirectUri: AuthSession.makeRedirectUri(),
        scopes: [
            'https://www.googleapis.com/auth/drive.appdata',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
    });

    // 로그인을 시도했을 때 응답 처리 (Web에서는 이 방식이 더 안정적입니다)
    useEffect(() => {
        console.log('🔄 Auth Response received:', response?.type);
        if (response?.type === 'success') {
            const { authentication } = response;
            console.log('🔑 Authentication success. Token present:', !!authentication?.accessToken);
            if (authentication?.accessToken) {
                setLoading(true);
                setAccessToken(authentication.accessToken);
                getGoogleUserInfo(authentication.accessToken)
                    .then(userInfo => {
                        setUser(userInfo);
                        console.log('✅ Google User Info loaded:', userInfo.email);
                    })
                    .catch(err => console.error('UserInfo fetch error:', err))
                    .finally(() => setLoading(false));
            }
        } else if (response?.type === 'error') {
            console.error('❌ Auth Error Response:', response.error);
        }
    }, [response]);

    // 구글 로그인 처리
    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const result = await promptAsync();
            if (result.type === 'success') {
                const token = result.authentication?.accessToken;
                if (token) {
                    setAccessToken(token);
                    const userInfo = await getGoogleUserInfo(token);
                    setUser(userInfo);
                    console.log('✅ Google Login Success:', userInfo.email);
                }
            }
        } catch (error) {
            console.error('Google Login Error:', error);
            Alert.alert('エラー', 'Googleログイン에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    // 구글 로그아웃
    const handleGoogleLogout = () => {
        setUser(null);
        setAccessToken(null);
    };

    // 클라우드 백업 실행
    const handleCloudBackup = async () => {
        console.log('☁️ Backup button pressed. AccessToken:', accessToken ? 'YES' : 'NO');
        if (!accessToken) {
            if (Platform.OS === 'web') alert('Error: Access token is missing. Please log in again.');
            else Alert.alert('Error', 'Access token is missing. Please log in again.');
            return;
        }
        setCloudLoading(true);
        try {
            console.log('1. Gathering data...');
            const transactions = await getAllTransactions();
            const backupData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                transactions,
            };
            const jsonString = JSON.stringify(backupData, null, 2);

            console.log('2. Finding existing backup file...');
            const fileId = await findBackupFile(accessToken!);
            console.log('3. Uploading to Drive... FileId:', fileId || 'new');
            await uploadBackupToDrive(accessToken!, jsonString, fileId);

            console.log('4. Backup Success!');
            const msg = '成功: Googleドライブにバックアップを保存했습니다';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('成功', msg);
        } catch (error) {
            console.error('Cloud Backup Error:', error);
            const msg = `クラウドバック업에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`;
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('エラー', msg);
        } finally {
            setCloudLoading(false);
        }
    };

    // 클라우드 복구 실행
    const handleCloudRestore = async () => {
        console.log('☁️ Restore button pressed. AccessToken:', accessToken ? 'YES' : 'NO');
        if (!accessToken) {
            if (Platform.OS === 'web') alert('Error: Access token is missing. Please log in again.');
            else Alert.alert('Error', 'Access token is missing. Please log in again.');
            return;
        }

        if (Platform.OS === 'web') {
            if (window.confirm('クラウド復元: Googleドライブから 데이터를 읽기, 현재의 데이터를 덮어쓰시겠습니까?')) {
                executeRestore();
            }
        } else {
            Alert.alert(
                'クラウド復元',
                'Googleドライブから 데이터를 읽기, 현재의 데이터를 덮어쓰시겠습니까?',
                [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '実行하는', onPress: () => executeRestore() }
                ]
            );
        }
    };

    const executeRestore = async () => {
        setCloudLoading(true);
        try {
            console.log('1. Finding backup file for restore...');
            const fileId = await findBackupFile(accessToken!);
            if (!fileId) {
                console.log('❌ No backup file found');
                const msg = '通知: Googleドライブ에 백업 파일이 존재하지 않습니다';
                if (Platform.OS === 'web') alert(msg);
                else Alert.alert('通知', msg);
                return;
            }

            console.log('2. Downloading file... FileId:', fileId);
            const jsonString = await downloadBackupFromDrive(accessToken!, fileId!);
            const parsedData = JSON.parse(jsonString);

            if (parsedData.transactions) {
                console.log('3. Replacing local data...');
                await replaceAllTransactions(parsedData.transactions);
                console.log('4. Restore Success!');
                const msg = '完了: 데이터를 복원했습니다. 앱을 다시 시작해 주세요.';
                if (Platform.OS === 'web') {
                    alert(msg);
                    window.location.reload();
                } else {
                    Alert.alert('完了', msg);
                }
            }
        } catch (error) {
            console.error('Cloud Restore Error:', error);
            const msg = `クラウド복원에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`;
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('エラー', msg);
        } finally {
            setCloudLoading(false);
        }
    };

    // 설정 로드 (기존 로직 유지)
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

            {/* 클라우드 백업 섹션 (NEW) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>クラウド同期 (Google Drive)</Text>
                <View style={styles.card}>
                    {!user ? (
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleLogin}
                            disabled={!request}
                        >
                            <Ionicons name="logo-google" size={20} color="white" />
                            <Text style={styles.googleButtonText}>Googleでログイン</Text>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            <View style={styles.userInfoRow}>
                                <Ionicons name="person-circle-outline" size={24} color={colors.primary.main} />
                                <Text style={styles.userEmail}>{user.email}</Text>
                                <TouchableOpacity onPress={handleGoogleLogout}>
                                    <Text style={styles.logoutText}>로그아웃</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            <View style={[styles.row, { marginTop: 10 }]}>
                                <TouchableOpacity
                                    style={[styles.smallButton, { backgroundColor: colors.primary.main }]}
                                    onPress={handleCloudBackup}
                                    disabled={cloudLoading}
                                >
                                    <Ionicons name="cloud-upload" size={18} color="white" />
                                    <Text style={styles.smallButtonText}>{cloudLoading ? '중...' : '클라우드 백업'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.smallButton, { backgroundColor: colors.accent.coral }]}
                                    onPress={handleCloudRestore}
                                    disabled={cloudLoading}
                                >
                                    <Ionicons name="cloud-download" size={18} color="white" />
                                    <Text style={styles.smallButtonText}>클라우드 복원</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* 로컬 데이터 관리 섹션 (기존 유지/수정) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ローカルデータ管理</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingItem} onPress={exportData}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="document-text-outline" size={24} color={colors.neutral.textSecondary} />
                            <Text style={styles.settingLabel}>파일로 내보내기 (.json)</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.neutral.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingItem} onPress={importData}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="folder-open-outline" size={24} color={colors.neutral.textSecondary} />
                            <Text style={styles.settingLabel}>파일에서 불러오기</Text>
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
    googleButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        gap: spacing.sm,
    },
    googleButtonText: {
        ...typography.button,
        color: 'white',
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    userEmail: {
        ...typography.body2,
        color: colors.neutral.textPrimary,
        flex: 1,
        marginLeft: spacing.sm,
    },
    logoutText: {
        ...typography.caption,
        color: colors.accent.coral,
        fontWeight: 'bold',
    },
    smallButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: borderRadius.sm,
        gap: spacing.xs,
        marginHorizontal: 4,
    },
    smallButtonText: {
        ...typography.caption,
        color: 'white',
        fontWeight: 'bold',
    },
});
