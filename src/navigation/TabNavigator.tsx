/**
 * Tab Navigator
 * 앱의 메인 네비게이션 구조
 */

import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ListScreen from '../screens/ListScreen';
import AddScreen from '../screens/AddScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootTabParamList = {
    Home: undefined;
    List: undefined;
    Add: undefined;
    Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type IconName = 'home' | 'home-outline' | 'list' | 'list-outline' |
    'add-circle' | 'add-circle-outline' | 'settings' | 'settings-outline';

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: IconName;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'List':
                            iconName = focused ? 'list' : 'list-outline';
                            break;
                        case 'Add':
                            iconName = focused ? 'add-circle' : 'add-circle-outline';
                            break;
                        case 'Settings':
                            iconName = focused ? 'settings' : 'settings-outline';
                            break;
                        default:
                            iconName = 'home';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary.main,
                tabBarInactiveTintColor: colors.neutral.textTertiary,
                tabBarStyle: {
                    backgroundColor: colors.neutral.white,
                    borderTopColor: colors.neutral.border,
                    paddingBottom: Platform.OS === 'web' ? 15 : 5,
                    paddingTop: Platform.OS === 'web' ? 8 : 5,
                    height: Platform.OS === 'web' ? 85 : 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                headerStyle: {
                    backgroundColor: colors.primary.main,
                },
                headerTintColor: colors.neutral.white,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'ホーム',
                    headerTitle: 'カシモ'
                }}
            />
            <Tab.Screen
                name="List"
                component={ListScreen}
                options={{ title: '記録' }}
            />
            <Tab.Screen
                name="Add"
                component={AddScreen}
                options={{ title: '追加' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: '設定' }}
            />
        </Tab.Navigator>
    );
}
