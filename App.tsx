/**
 * Kashimo App Entry Point
 * 앱 진입점 및 네비게이션 설정
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

import TabNavigator from './src/navigation/TabNavigator';
import DetailScreen from './src/screens/DetailScreen';
import EditScreen from './src/screens/EditScreen';
import { colors } from './src/styles/theme';
import { requestNotificationPermissions } from './src/services/notifications';

import { initDatabase } from './src/services/database';

// 네비게이션 타입 정의
export type RootStackParamList = {
  Main: undefined;
  Detail: { transactionId: string };
  Edit: { transactionId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // 앱 시작 시 초기 설정
  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      await requestNotificationPermissions();
    };
    setup();

    // Android 하단 바 숨기기 (몰입 모드)
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.primary.main,
              },
              headerTintColor: colors.neutral.white,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
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
              options={{ title: '取引を編集' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
