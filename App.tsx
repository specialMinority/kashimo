import { AppText as Text } from './src/components/AppText';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import TabNavigator, { RootTabParamList } from './src/navigation/TabNavigator';
import DetailScreen from './src/screens/DetailScreen';
import EditScreen from './src/screens/EditScreen';
import { colors, spacing, borderRadius } from './src/styles/theme';
import { getAllTransactions, initDatabase } from './src/services/database';
import { cleanUpDeletedTransactionReminders } from './src/services/notifications';
import { brandAssets } from './src/constants/branding';

export type RootStackParamList = {
    Main: NavigatorScreenParams<RootTabParamList> | undefined;
    Detail: { transactionId: string };
    Edit: { transactionId: string };
};
const Stack = createNativeStackNavigator<RootStackParamList>();
void SplashScreen.preventAutoHideAsync().catch(() => {});
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary.main, background: colors.neutral.background, card: colors.neutral.background, text: colors.neutral.textPrimary, border: colors.neutral.border } };

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error) { console.error('App render failed', error); }
    render() {
        if (!this.state.failed) return this.props.children;
        return <View style={styles.center}>
            <Text style={styles.errorTitle}>画面を読み込めませんでした</Text>
            <Text style={styles.message}>アプリを開き直して、もう一度お試しください。</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => Platform.OS === 'web' ? window.location.reload() : this.setState({ failed: false })}><Text style={styles.retryText}>再読み込み</Text></TouchableOpacity>
        </View>;
    }
}

export default function App() {
    const [fontsLoaded, fontError] = useFonts(Ionicons.font);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        setError(false);
        const initialize = async () => {
            try {
                await initDatabase();
                const records = await getAllTransactions();
                await cleanUpDeletedTransactionReminders(records.map(t => t.id));
                if (active) setReady(true);
            } catch (e) {
                console.error('Storage initialization failed', e);
                if (active) setError(true);
            }
        };
        void initialize();
        return () => { active = false; };
    }, [attempt]);
    useEffect(() => {
        if (error || (ready && (fontsLoaded || fontError))) void SplashScreen.hideAsync().catch(() => {});
    }, [ready, error, fontsLoaded, fontError]);

    if (error) return <View style={styles.center}>
        <Text style={styles.errorTitle}>保存した記録を開けませんでした</Text>
        <Text style={styles.message}>ブラウザの保存設定を確認してください。{ '\n' }既存の記録は変更されていません。</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => setAttempt(a => a + 1)}><Text style={styles.retryText}>再試行</Text></TouchableOpacity>
    </View>;
    if (!ready || (!fontsLoaded && !fontError)) return <View style={styles.center}><ActivityIndicator color={colors.primary.main} size="large" /><Text style={styles.message}>カシモを準備しています…</Text></View>;
    return <ErrorBoundary>
        <GestureHandlerRootView style={styles.root}>
            <Image source={brandAssets.cozy} style={styles.backgroundPhoto} resizeMode="cover" />
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.veil]} />
            <View style={styles.app}>
                <SafeAreaProvider>
                    <NavigationContainer theme={navigationTheme}>
                        <StatusBar style="dark" />
                        <Stack.Navigator screenOptions={({ navigation }) => ({
                            headerStyle: { backgroundColor: colors.neutral.background },
                            headerTintColor: colors.neutral.textPrimary,
                            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
                            headerShadowVisible: false,
                            headerLeft: props => props.canGoBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="戻る" style={styles.back} onPress={() => navigation.goBack()}><Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="arrow-back" size={23} color={colors.neutral.textPrimary} /></TouchableOpacity> : null,
                            contentStyle: { backgroundColor: colors.neutral.background },
                        })}>
                            <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
                            <Stack.Screen name="Detail" component={DetailScreen} options={{ title: '取引の詳細' }} />
                            <Stack.Screen name="Edit" component={EditScreen} options={{ title: '取引を編集' }} />
                        </Stack.Navigator>
                    </NavigationContainer>
                </SafeAreaProvider>
            </View>
        </GestureHandlerRootView>
    </ErrorBoundary>;
}
const styles = StyleSheet.create({
    root: { flex: 1, alignItems: 'center', overflow: 'hidden', backgroundColor: colors.neutral.background },
    backgroundPhoto: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
    app: { flex: 1, width: '100%', maxWidth: 960, backgroundColor: colors.neutral.background },
    veil: { backgroundColor: colors.surface.veil },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.background, padding: spacing.lg },
    errorTitle: { fontSize: 19, fontWeight: '600', color: colors.neutral.textPrimary, textAlign: 'center' },
    message: { fontSize: 13, lineHeight: 23, color: colors.neutral.textSecondary, marginTop: spacing.md, textAlign: 'center' },
    retry: { padding: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.primary.main, borderRadius: borderRadius.round, marginTop: spacing.lg },
    retryText: { color: colors.neutral.white, fontWeight: '600' },
    back: { width: 44, height: 44, justifyContent: 'center' },
});
