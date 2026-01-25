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
        console.log('Debug: checking FileSystem object...');
        // DEBUG: Breakpoint 1
        Alert.alert('Debug', `Doc: ${FileSystem.documentDirectory}, Cache: ${FileSystem.cacheDirectory}`);

        const transactions = await getAllTransactions();
        const backupData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            transactions,
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const fileName = `kashimo_backup_${new Date().getTime()}.json`;

        // Android/Expo Go issue workaround: Use cacheDirectory for sharing
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

        // DEBUG: Breakpoint 2
        Alert.alert('Debug', `BaseDir: ${baseDir}`);

        if (!baseDir) {
            console.error('FileSystem keys available:', { documentDirectory: FileSystem.documentDirectory, cacheDirectory: FileSystem.cacheDirectory });
            throw new Error(`Storage directory not available (doc: ${FileSystem.documentDirectory}, cache: ${FileSystem.cacheDirectory})`);
        }

        const filePath = `${baseDir}${fileName}`;

        // DEBUG: Breakpoint 3
        Alert.alert('Debug', `Writing to: ${filePath}`);

        await FileSystem.writeAsStringAsync(filePath, jsonString);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath);
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
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

        // 기존 데이터 삭제 여부 확인? 
        // 여기서는 안전하게 "덮어쓰기" 대신 "병합" 또는 "전체 교체" 중 선택해야 함.
        // 현재는 안전을 위해 "기존 데이터 유지 + 새 데이터 추가(ID 중복 시 무시)" 로직이 좋지만,
        // 복구라는 의미가 강하므로 "전체 삭제 후 복구" 옵션을 제공하는 것이 깔끔함.

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
