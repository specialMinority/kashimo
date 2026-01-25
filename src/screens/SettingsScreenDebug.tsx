import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 파일명을 변경하여 캐시를 우회하는 전략
export default function SettingsScreenDebug() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🚀 Cache Busted! 🚀</Text>
            <Text style={styles.subText}>This verifies that the code update works.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0f7fa', // 색상도 바꿔서 시각적 확인
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#006064',
        marginBottom: 10,
    },
    subText: {
        fontSize: 16,
        color: '#00838f',
    },
});
