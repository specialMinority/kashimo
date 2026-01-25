import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { getAllTransactions, addTransaction, getDb } from './database';
import { Transaction } from '../types';

/**
 * 데이터 백업 (JSON 파일로 내보내기)
 */
export const exportData = async () => {
    try {
        const transactions = await getAllTransactions();
        const backupData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            transactions,
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const fileName = `kashimo_backup_${new Date().getTime()}.json`;

        if (Platform.OS === 'android') {
            // Android: Use Storage Access Framework to let user pick folder
            try {
                // DEBUG: Check if SAF exists
                console.log('FileSystem Keys:', Object.keys(FileSystem));

                if (!FileSystem.StorageAccessFramework) {
                    Alert.alert('CRITICAL DEBUG', 'FileSystem.StorageAccessFramework is undefined!');
                    console.error('FileSystem.StorageAccessFramework is missing', FileSystem);
                    return;
                }

                Alert.alert('DEBUG', 'Requesting directory permissions...');
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                console.log('Permissions Result:', permissions);

                if (permissions.granted) {
                    Alert.alert('DEBUG', `Permission Granted: ${permissions.directoryUri}`);

                    const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/json');
                    await FileSystem.writeAsStringAsync(uri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
                    Alert.alert('完了', 'バックアップファイルを保存しました');
                } else {
                    Alert.alert('キャンセル', '保存先が選択されませんでした');
                }
            } catch (e) {
                console.error('SAF Error:', e);
                Alert.alert('Error', `SAF Failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        } else {
            // iOS: Use Sharing
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) throw new Error("No available directory for temp file");

            const filePath = `${baseDir}${fileName}`;
            await FileSystem.writeAsStringAsync(filePath, jsonString);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath);
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        }
    } catch (error) {
        console.error('Backup failed detailed:', error);
        Alert.alert('Error', `Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * 데이터 복구 (JSON 파일에서 불러오기)
 */
export const importData = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
        });

        if (result.canceled) return;

        const fileUri = result.assets[0].uri;
        const jsonString = await FileSystem.readAsStringAsync(fileUri);

        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            Alert.alert('Error', 'Invalid JSON file');
            return;
        }

        if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
            Alert.alert('Error', 'Invalid backup file format');
            return;
        }

        const transactions = parsedData.transactions as Transaction[];
        const database = getDb();

        Alert.alert(
            '復元確認',
            '現在のデータを全て削除して、バックアップファイルの内容で上書きしますか？',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '実行する',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 전체 삭제
                            await database.runAsync('DELETE FROM transactions');

                            // 데이터 삽입
                            for (const t of transactions) {
                                await database.runAsync(
                                    `INSERT INTO transactions (id, amount, type, counterparty, dueDate, status, memo, createdAt, completedAt)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [t.id, t.amount, t.type, t.counterparty, t.dueDate, t.status, t.memo || null, t.createdAt, t.completedAt || null]
                                );
                            }

                            Alert.alert('完了', 'データを復元しました。\nアプリを再起動してください。');
                        } catch (e) {
                            console.error('Restore failed:', e);
                            Alert.alert('Error', 'Restore failed during database operation');
                        }
                    }
                }
            ]
        );

    } catch (error) {
        console.error('Import failed:', error);
        Alert.alert('Error', 'Import failed');
    }
};
