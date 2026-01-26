import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

interface ReminderBannerProps {
    count: number;
    onPress: () => void;
    onClose: () => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({ count, onPress, onClose }) => {
    if (count === 0) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.content} onPress={onPress}>
                <View style={styles.iconContainer}>
                    <Ionicons name="notifications" size={20} color={colors.neutral.white} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>今日が期限の取引があります</Text>
                    <Text style={styles.subtitle}>{count}件の取引を確認してください</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.neutral.textSecondary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral.white,
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        ...shadows.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.semantic.warning,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconContainer: {
        backgroundColor: colors.semantic.warning,
        padding: spacing.sm,
        borderRadius: borderRadius.round,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...typography.body1,
        fontWeight: 'bold',
        color: colors.neutral.textPrimary,
        fontSize: 14,
    },
    subtitle: {
        ...typography.caption,
        color: colors.neutral.textSecondary,
    },
    closeButton: {
        padding: spacing.sm,
    },
});
