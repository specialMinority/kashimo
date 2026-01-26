import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { colors, borderRadius, spacing, typography, shadows } from '../styles/theme';

export interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons: AlertButton[];
    onDismiss?: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
    visible,
    title,
    message,
    buttons,
    onDismiss
}) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.alertBox}>
                            <Text style={styles.title}>{title}</Text>
                            {message && <Text style={styles.message}>{message}</Text>}

                            <View style={styles.buttonContainer}>
                                {buttons.map((btn, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            btn.style === 'destructive' && styles.buttonDestructive,
                                            btn.style === 'cancel' && styles.buttonCancel,
                                            // Add spacing if not last
                                            index < buttons.length - 1 && styles.buttonSpacing
                                        ]}
                                        onPress={btn.onPress}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            btn.style === 'destructive' && styles.textDestructive,
                                            btn.style === 'cancel' && styles.textCancel,
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    alertBox: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: colors.neutral.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.lg,
    },
    title: {
        ...typography.subtitle1,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    message: {
        ...typography.body1,
        color: colors.neutral.textSecondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    // For 2 buttons row, typically used in alerts
    button: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary.main,
    },
    buttonSpacing: {
        marginRight: 0,
    },
    buttonDestructive: {
        backgroundColor: colors.semantic.error,
    },
    buttonCancel: {
        backgroundColor: colors.neutral.border,
    },
    buttonText: {
        ...typography.button,
        color: colors.neutral.white,
    },
    textDestructive: {
        color: colors.neutral.white,
    },
    textCancel: {
        color: colors.neutral.textPrimary,
    },
});
