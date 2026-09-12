import { AppText as Text } from './AppText';
import React from 'react';
import { Image, useWindowDimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { brandAssets } from '../constants/branding';
import { borderRadius, colors, spacing } from '../styles/theme';

export function BrandHeader() {
    const insets = useSafeAreaInsets();
    return <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Image source={brandAssets.mascot} style={styles.avatar} accessibilityLabel="カシモの猫のマスコット" />
        <View style={styles.wordmark}>
            <Text style={styles.name}>kashimo<Text style={styles.dot}>.</Text></Text>
            <Text style={styles.caption}>小さな記録、やさしい毎日。</Text>
        </View>
        <View style={styles.localBadge}>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="shield-checkmark-outline" color={colors.primary.main} size={15} />
            <Text style={styles.localText}>この端末に保存</Text>
        </View>
    </View>;
}

export function ScreenHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
    return <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.headingTitle}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
    </View>;
}

export function CatHero({ onAdd }: { onAdd: () => void }) {
    const { width } = useWindowDimensions();
    return <View style={styles.hero}>
        <Image source={brandAssets.tower} style={styles.heroPhoto} resizeMode="cover" accessibilityLabel="キャットタワーでくつろぐカシモ" />
        <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>WITH KASHIMO</Text>
            <Text accessibilityRole="header" style={[styles.heroTitle, { fontSize: width < 360 ? 19 : width < 600 ? 24 : 32 }]}>お金のことも、{'\n'}気持ちよく。</Text>
            <Text style={styles.heroDescription}>貸した、借りたをそっと記録。{'\n'}大切なつながりは、そのままに。</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onAdd} style={styles.heroButton}>
                <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="add" size={18} color={colors.neutral.white} />
                <Text style={styles.heroButtonText}>取引を記録</Text>
            </TouchableOpacity>
        </View>
    </View>;
}

export function CatEmpty({ title, description, onAdd }: { title: string; description: string; onAdd?: () => void }) {
    return <View style={styles.empty}>
        <Image source={brandAssets.mascot} style={styles.emptyCat} accessibilityLabel="カシモの猫" />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {onAdd && <TouchableOpacity accessibilityRole="button" onPress={onAdd} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>最初の取引を記録する</Text>
            <Ionicons aria-hidden={true} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name="arrow-forward" size={17} color={colors.primary.main} />
        </TouchableOpacity>}
    </View>;
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm, backgroundColor: colors.neutral.background, borderBottomColor: colors.neutral.border, borderBottomWidth: 1 },
    avatar: { width: 46, height: 46, borderRadius: borderRadius.md },
    wordmark: { flex: 1 },
    name: { fontSize: 25, fontWeight: '800', letterSpacing: -1, color: colors.neutral.textPrimary },
    dot: { color: colors.primary.main },
    caption: { fontSize: 10, color: colors.neutral.textSecondary, marginTop: 1 },
    localBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    localText: { fontSize: 10, color: colors.neutral.textSecondary },
    heading: { gap: spacing.sm, marginBottom: spacing.lg },
    eyebrow: { color: colors.primary.main, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    headingTitle: { color: colors.neutral.textPrimary, fontSize: 27, fontWeight: '700', letterSpacing: -0.5 },
    description: { color: colors.neutral.textSecondary, fontSize: 13, lineHeight: 22 },
    hero: { minHeight: 268, backgroundColor: colors.surface.cream, borderRadius: borderRadius.lg, overflow: 'hidden' },
    heroPhoto: { position: 'absolute', right: 0, top: 0, height: '100%', width: '46%' },
    heroCopy: { width: '61%', padding: spacing.lg, paddingRight: spacing.sm, backgroundColor: colors.surface.glass, minHeight: 268, justifyContent: 'center', borderTopRightRadius: 70, borderBottomRightRadius: 70 },
    heroTitle: { fontSize: 27, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, color: colors.neutral.textPrimary, marginTop: spacing.sm },
    heroDescription: { color: colors.neutral.textSecondary, fontSize: 11, lineHeight: 20, marginTop: spacing.sm },
    heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: borderRadius.round, backgroundColor: colors.primary.main, marginTop: spacing.md },
    heroButtonText: { color: colors.neutral.white, fontSize: 12, fontWeight: '600' },
    empty: { padding: spacing.lg, alignItems: 'center', backgroundColor: colors.neutral.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.neutral.border, gap: spacing.sm },
    emptyCat: { width: 100, height: 100, borderRadius: borderRadius.round },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.textPrimary, textAlign: 'center' },
    emptyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    emptyButtonText: { color: colors.primary.main, fontSize: 13, fontWeight: '600' },
});
