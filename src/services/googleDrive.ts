import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

// 클라이언트 ID 플레이스홀더 (사용자가 직접 입력해야 함)
export const GOOGLE_CONFIG = {
    androidClientId: '840130635293-pgh589hjs4r6eb8q8j8n89f6v7v6p6p6.apps.googleusercontent.com', // 예속
    iosClientId: '',
    webClientId: '777385956244-q07ttp7g22ndgpatma9u75f5t7e1lfl4.apps.googleusercontent.com', // 예속
};

/**
 * API 응답 확인 유틸리티
 */
const checkResponse = async (response: Response, functionName: string) => {
    console.log(`📡 [checkResponse] Processing response for ${functionName}. OK:`, response.ok);
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = await response.text();
        }
        console.error(`❌ [${functionName}] Error:`, errorBody);
        throw new Error(`Google Drive API Error (${functionName}): ${typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody}`);
    }

    // 일부 응답은 본문이 없을 수 있습니다 (Status 204 등)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        console.log(`📡 [checkResponse] Parsing JSON for ${functionName}...`);
        return response.json();
    }

    console.log(`📡 [checkResponse] Returning text/empty for ${functionName}...`);
    return response.text();
};

export interface GoogleUser {
    email: string;
    name: string;
    picture?: string;
}

/**
 * 구글 사용자 정보 가져오기
 */
export const getGoogleUserInfo = async (accessToken: string): Promise<GoogleUser> => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.json();
};

/**
 * 드라이브에서 kashimo_backup.json 파일 찾기 (AppData 전용)
 */
export const findBackupFile = async (accessToken: string): Promise<string | null> => {
    console.log('🔍 [findBackupFile] Start searching in appDataFolder...');
    const q = encodeURIComponent("name = 'kashimo_backup.json' and trashed = false");
    const response = await fetch(`${DRIVE_API_URL}/files?q=${q}&spaces=appDataFolder`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('🔍 [findBackupFile] Fetch completed. Status:', response.status);

    const data = await checkResponse(response, 'findBackupFile');
    console.log('🔍 [findBackupFile] Found files count:', data.files?.length || 0);

    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
};

/**
 * 드라이브에 백업 업로드 (생성 또는 업데이트)
 */
export const uploadBackupToDrive = async (accessToken: string, content: string, fileId?: string | null) => {
    const metadata = {
        name: 'kashimo_backup.json',
        mimeType: 'application/json',
        parents: fileId ? undefined : ['appDataFolder'], // 새 파일 생성 시 AppData 폴더에 저장
    };

    // Google Drive v3 Multipart Upload 형식 (명시적 Boundary 생성)
    const boundary = '-------kashimo_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelimiter;

    const url = fileId
        ? `${DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=multipart`
        : `${DRIVE_UPLOAD_URL}/files?uploadType=multipart`;

    console.log(`📤 [uploadBackupToDrive] Sending request to ${url} (Method: ${fileId ? 'PATCH' : 'POST'})`);

    const response = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body,
    });
    console.log('📤 [uploadBackupToDrive] Fetch completed. Status:', response.status);

    return checkResponse(response, 'uploadBackupToDrive');
};

/**
 * 드라이브에서 백업 다운로드
 */
export const downloadBackupFromDrive = async (accessToken: string, fileId: string): Promise<string> => {
    const response = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        return checkResponse(response, 'downloadBackupFromDrive');
    }

    return response.text();
};
