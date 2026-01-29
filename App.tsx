/**
 * Kashimo App Entry Point
 * 앱 진입점 및 네비게이션 설정
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import TabNavigator from './src/navigation/TabNavigator';
import DetailScreen from './src/screens/DetailScreen';
import EditScreen from './src/screens/EditScreen';
import { colors } from './src/styles/theme';
import { initDatabase } from './src/services/database';
import { requestNotificationPermissions } from './src/services/notifications';

// 네비게이션 타입 정의
export type RootStackParamList = {
  Main: undefined;
  Detail: { transactionId: string };
  Edit: { transactionId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 스플래시 스크린 유지
try {
  SplashScreen.preventAutoHideAsync().catch(() => { });
} catch (e) { }

// 에러 바운더리 (안정성 확보)
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.background, padding: 20 }}>
          <Ionicons name="warning" size={64} color={colors.accent.coral} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.neutral.textPrimary, marginTop: 20 }}>App Error Detected</Text>
          <Text style={{ marginTop: 10, textAlign: 'center', color: colors.neutral.textSecondary }}>{this.state.error?.toString()}</Text>
          <TouchableOpacity
            style={{ marginTop: 30, padding: 15, backgroundColor: colors.primary.main, borderRadius: 10 }}
            onPress={() => window.location.reload()}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('App: Rendering started');

  // Web에서 아이콘 안보임 문제 해결을 위해 CDN 경로 명시 (CORS 허용되는 unpkg 사용)
  const fontSource = Platform.OS === 'web'
    ? {
      ...Ionicons.font,
      'ionicons': 'https://unpkg.com/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'
    }
    : Ionicons.font;

  const [fontsLoaded, fontError] = useFonts(fontSource);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        console.log('App: Setup started');
        await initDatabase();
        console.log('App: DB Init done');

        // Notifications might be tricky on Web
        try {
          await requestNotificationPermissions();
          console.log('App: Notifications init done');
        } catch (notifError) {
          console.warn('App: Notification permission failed but continuing', notifError);
        }

      } catch (e) {
        console.error('Setup failed', e);
        if (Platform.OS === 'web') {
          // On web, if setup fails, we might still want to try showing something
          console.log('App: Setup failed but trying to proceed');
        }
      }
    };
    setup();

    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden');
        NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (e) { }
    }

    // 5초 타임아웃 (Safety fallback)
    const timer = setTimeout(() => {
      setIsReady(prev => {
        if (!prev) console.log('App: 5s Fallback timer triggered isReady');
        return true;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('App: Font status changed', { fontsLoaded, fontError });
    if (fontsLoaded || fontError) {
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, fontError]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary.main }}>
        <ActivityIndicator size="large" color="white" />
        <Text style={{ color: 'white', marginTop: 10 }}>Kashimo Initializing...</Text>
      </View>
    );
  }

  const RootView = GestureHandlerRootView;

  console.log('App: Rendering Navigation Container');
  return (
    <ErrorBoundary>
      <RootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={({ navigation }) => ({
                headerStyle: { backgroundColor: colors.primary.main },
                headerTintColor: colors.neutral.white,
                headerTitleStyle: { fontWeight: 'bold' },
                headerBackTitleVisible: false,
                headerLeft: (props) => {
                  if (props?.canGoBack) {
                    return (
                      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.neutral.white} />
                      </TouchableOpacity>
                    );
                  }
                  return null;
                },
              })}
            >
              <Stack.Screen
                name="Main"
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Detail"
                component={DetailScreen}
                options={{ title: '取引詳細' }}
              />
              <Stack.Screen
                name="Edit"
                component={EditScreen}
                options={{ title: '取引를 編集' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </RootView>
    </ErrorBoundary>
  );
}
