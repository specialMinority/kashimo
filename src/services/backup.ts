/**
 * Default Backup Implementation (Fallback)
 * This file is used by TypeScript for type checking and by Bundlers if no platform extension matches.
 * The actual implementations are in backup.native.ts and backup.web.ts.
 */

export const exportData = async (): Promise<void> => {
    throw new Error('Platform not supported: exportData');
};

export const importData = async (): Promise<void> => {
    throw new Error('Platform not supported: importData');
};
