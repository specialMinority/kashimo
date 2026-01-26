/**
 * Notifications Service
 * 로컬 푸시 알림 관리
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_DAYS } from '../constants';

// 알림 핸들러 설정 (앱이 foreground에 있을 때도 알림 표시)
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

// 알림 설정 저장 키
const NOTIFICATION_SETTINGS_KEY = '@kashimo/notification_settings';
const SCHEDULED_NOTIFICATIONS_KEY = '@kashimo/scheduled_notifications';

// 알림 설정 타입
export interface NotificationSettings {
    enabled: boolean;
    reminderDays: number[]; // [7, 3, 1, 0] = D-7, D-3, D-1, D-Day
}

// 기본 알림 설정
const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    reminderDays: DEFAULT_REMINDER_DAYS,
};

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    // Web: Native Browser Notification API
    if (Platform.OS === 'web') {
        if (!('Notification' in window)) {
            alert('이 브라우저는 알림을 지원하지 않습니다');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                return true;
            } else {
                alert('알림 권한이 거부되었습니다. (브라우저 설정 확인)');
                return false;
            }
        } catch (e) {
            console.error(e);
            alert('알림 권한 요청 중 오류 발생');
            return false;
        }
    }

    // 물리 디바이스인지 확인 (시뮬레이터에서는 푸시 알림 불가)
    if (!Device.isDevice) {
        console.log('⚠️ 알림은 물리 디바이스에서만 동작합니다');
        return false;
    }

    // 기존 권한 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 권한이 없으면 요청
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('❌ 알림 권한이 거부되었습니다');
        return false;
    }

    // Android 채널 설정
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'カシモ通知',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4ECDC4',
        });
    }

    console.log('✅ 알림 권한 획득 완료');
    return true;
}

/**
 * 알림 설정 저장
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    console.log('✅ 알림 설정 저장:', settings);
}

/**
 * 알림 설정 불러오기
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // 타입 안전성 보장 (Android 에러 방지)
            return {
                enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
                reminderDays: Array.isArray(parsed.reminderDays) ? parsed.reminderDays : DEFAULT_SETTINGS.reminderDays,
            };
        }
    } catch (error) {
        console.error('❌ 알림 설정 로드 실패:', error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * 거래에 대한 알림 스케줄링
 * @param transactionId 거래 ID
 * @param counterparty 상대방 이름
 * @param amount 금액
 * @param dueDate 기한
 * @param type 거래 유형 (lent/borrowed)
 */
export async function scheduleTransactionReminders(
    transactionId: string,
    counterparty: string,
    amount: number,
    dueDate: Date,
    type: 'lent' | 'borrowed'
): Promise<string[]> {
    const settings = await getNotificationSettings();

    if (!settings.enabled) {
        console.log('⚠️ 알림이 비활성화되어 있습니다');
        return [];
    }

    const scheduledIds: string[] = [];
    const formattedAmount = `¥${amount.toLocaleString()}`;
    const action = type === 'lent' ? 'を受け取る' : 'を返す';

    for (const daysBeforeDue of settings.reminderDays) {
        const triggerDate = new Date(dueDate);
        triggerDate.setDate(triggerDate.getDate() - daysBeforeDue);
        triggerDate.setHours(9, 0, 0, 0); // 오전 9시에 알림

        // 과거 날짜는 스킵
        if (triggerDate <= new Date()) {
            continue;
        }

        const dDayText = daysBeforeDue === 0 ? '今日' : `あと${daysBeforeDue}日`;
        const title = type === 'lent'
            ? `💰 ${counterparty}さんから${formattedAmount}${action}予定`
            : `📣 ${counterparty}さんに${formattedAmount}${action}予定`;
        const body = `${dDayText}が期限です。確認してください。`;

        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { transactionId, type: 'reminder' },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                },
            });

            scheduledIds.push(notificationId);
            console.log(`✅ 알림 스케줄링: D-${daysBeforeDue} (${triggerDate.toLocaleDateString()})`);
        } catch (error) {
            console.error(`❌ 알림 스케줄링 실패 (D-${daysBeforeDue}):`, error);
        }
    }

    // 스케줄된 알림 ID 저장 (나중에 취소용)
    await saveScheduledNotifications(transactionId, scheduledIds);

    return scheduledIds;
}

/**
 * 스케줄된 알림 ID 저장
 */
async function saveScheduledNotifications(transactionId: string, notificationIds: string[]): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
        const map: Record<string, string[]> = stored ? JSON.parse(stored) : {};
        map[transactionId] = notificationIds;
        await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(map));
    } catch (error) {
        console.error('❌ 알림 ID 저장 실패:', error);
    }
}

/**
 * 거래 관련 알림 취소
 */
export async function cancelTransactionReminders(transactionId: string): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
        if (!stored) return;

        const map: Record<string, string[]> = JSON.parse(stored);
        const notificationIds = map[transactionId];

        if (notificationIds) {
            for (const id of notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(id);
            }
            console.log(`✅ 알림 취소: ${transactionId} (${notificationIds.length}개)`);

            // 저장된 목록에서 제거
            delete map[transactionId];
            await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(map));
        }
    } catch (error) {
        console.error('❌ 알림 취소 실패:', error);
    }
}

/**
 * 모든 스케줄된 알림 취소
 */
export async function cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
    console.log('✅ 모든 알림 취소 완료');
}

/**
 * 스케줄된 알림 목록 확인 (디버깅용)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * 앱 실행 시 리마인더 체크 (Web PWA용)
 * 백그라운드 싱크가 제한적인 환경에서 앱 실행 시점에 알림을 체크합니다.
 */
export async function checkRemindersOnAppLoad(): Promise<number> {
    // 1. 설정 확인
    const settings = await getNotificationSettings();
    if (!settings.enabled) return 0;

    try {
        // 2. 스케줄된 알림 데이터 로드 (Web에서는 실제 스케줄링이 안될 수 있으므로, DB 데이터 기준으로 체크하는 것이 더 정확함)
        // 하지만 여기서는 간단히 '저장된 스케줄'을 확인하거나, 
        // 또는 실제로는 `database.ts`에서 '오늘 기한인 항목'을 조회하는 것이 맞음.
        // 순환 참조 방지를 위해 database.ts를 여기서 임포트하면 안됨.
        // 따라서, 이 함수는 호출하는 쪽(HomeScreen)에서 DB 조회를 수행하고, 결과만 넘겨받아 알림을 띄우는 편이 나음.

        // 하지만 요구사항은 'notifications.ts'에 로직을 두는 것.
        // database -> notifications (X)
        // HomeScreen -> database (Get Pending) -> notifications (Show Alert) (O)

        // 따라서 이 함수는 'Web Notification API' 권한을 요청하고, 가능하면 시스템 알림을 띄우는 역할만 수행.
        if (Platform.OS === 'web' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        }
    } catch (e) {
        console.error('Reminder check failed:', e);
    }
    return 0;
}

/**
 * 웹용 시스템 알림 발송 helper
 */
export const sendWebNotification = (title: string, body: string) => {
    if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/assets/icon.png' });
    }
};

/**
 * 테스트 알림 발송 (즉시)
 */
export async function sendTestNotification(): Promise<void> {
    if (Platform.OS === 'web') {
        if (Notification.permission === 'granted') {
            sendWebNotification('カシモ テスト通知', 'Web通知が正常に動作しています！');
            // alert('通知を送信しました');
        } else {
            alert('알림 권한이 없습니다. 설정을 확인해주세요.');
        }
        return;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🎉 カシモ テスト通知',
            body: 'アプリの通知が正常に動作しています！',
            sound: true,
        },
        trigger: null, // 즉시 발송
    });
    console.log('✅ 테스트 알림 발송');
}
