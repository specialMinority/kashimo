import { Platform } from 'react-native';
import { getAllTransactions, replaceAllTransactions } from './database';
import { Transaction } from '../types';

/**
 * Web Backup: Download JSON file
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

        // Create Blob and Trigger Download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ [Web] Backup file downloaded');
        alert('バックアップファイルをダウンロードしました'); // Simple Web Alert
    } catch (error) {
        console.error('Backup failed:', error);
        alert('Backup failed');
    }
};

/**
 * Web Restore: Open File Picker and Read JSON
 */
export const importData = async () => {
    return new Promise<void>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) {
                resolve();
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonString = event.target?.result as string;
                    const parsedData = JSON.parse(jsonString);

                    if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
                        alert('Invalid backup file format');
                        resolve();
                        return;
                    }

                    const transactions = parsedData.transactions as Transaction[];

                    if (confirm('現在のデータを全て削除して、バックアップファイルの内容で上書きしますか？')) {
                        await replaceAllTransactions(transactions);
                        alert('完了\nデータを復元しました。');
                        window.location.reload();
                    }
                    resolve();
                } catch (error) {
                    console.error('Import Error:', error);
                    alert('Failed to import file');
                    resolve();
                }
            };
            reader.readAsText(file);
        };

        input.click();
    });
};
