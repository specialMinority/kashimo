import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius } from '../styles/theme';
import { BrandHeader } from '../components/Brand';
import HomeScreen from '../screens/HomeScreen';
import ListScreen from '../screens/ListScreen';
import AddScreen from '../screens/AddScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootTabParamList = { Home: undefined; List: undefined; Add: undefined; Settings: undefined };
const Tab = createBottomTabNavigator<RootTabParamList>();
const icons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = { Home: 'home-outline', List: 'reader-outline', Add: 'add', Settings: 'options-outline' };

export default function TabNavigator() {
    const insets = useSafeAreaInsets();
    return <Tab.Navigator screenOptions={({ route }) => ({
        header: () => <BrandHeader />,
        tabBarAccessibilityLabel: ({ Home: 'ホーム', List: '記録', Add: '追加', Settings: '設定' })[route.name],
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral.textTertiary,
        tabBarStyle: { backgroundColor: colors.neutral.card, borderTopColor: colors.neutral.border, height: 68 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, elevation: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        tabBarIcon: ({ color, focused }) => <View style={{ paddingHorizontal: 14, paddingVertical: 4, borderRadius: borderRadius.round, backgroundColor: route.name === 'Add' ? colors.primary.main : focused ? colors.surface.sage : colors.surface.transparent }}>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={icons[route.name]} color={route.name === 'Add' ? colors.neutral.white : color} size={22} />
        </View>,
    })}>
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
        <Tab.Screen name="List" component={ListScreen} options={{ title: '記録' }} />
        <Tab.Screen name="Add" component={AddScreen} options={{ title: '追加' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>;
}
