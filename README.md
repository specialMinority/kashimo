# Kashimo (カシモ)

> **友達との お金、もう忘れない**  
> (친구와의 돈, 이제 잊지 않아요)

**Kashimo**는 인터넷 연결 없이도 동작하는 **오프라인 퍼스트(Offline-First)** 개인 금전거래 관리 앱입니다.
상대방에게 앱 설치를 강요하지 않고, 나만의 기록으로 확실하게 관리하세요.

> **Hybrid Architecture**:
> *   **Android**: Google Play Store (Native App)
> *   **iOS**: Safari PWA (Add to Home Screen)

## 📱 주요 기능

### 1. 🔒 완벽한 프라이버시 (Local Database)
- **Native (Android)**: SQLite 고성능 로컬 DB 사용
- **Web (iOS/PWA)**: LocalStorage 기반 보안 저장소 사용
- 회원가입이나 로그인이 전혀 필요 없습니다.

### 2. 💸 스마트한 거래 관리
- **빌려준 돈 / 빌린 돈**을 한눈에 파악 (Dashboard)
- 잊어버리기 쉬운 반환 기한 관리
- **부분 상환(Partial Payment)** 지원
- 거래완료 처리 및 실행 취소(Undo) 기능

### 3. 🔔 자동 리마인더
- 반환 기한에 맞춰 자동으로 알림 발송 (Native Only)
- **알림 주기**: D-7, D-3, D-1, D-Day
- 사용자가 직접 독촉하지 않아도 앱이 알려줍니다.

### 4. 💾 데이터 안전 보관 (Backup & Restore)
- **백업**: 전체 거래 내역을 JSON 파일로 추출하여 안전하게 보관
- **복구**: 기기를 변경하거나 브라우저 캐시가 삭제되어도 복구 가능
- **플랫폼별 최적화**:
    - **Android**: 폴더 직접 선택 (SAF)
    - **Web/iOS**: 파일 다운로드/업로드 (Blob API)

---

## 📸 스크린샷

| Screen 1 | Screen 2 | Screen 3 |
|:---:|:---:|:---:|
| <img src="assets/screenshots/screen_1.jpg" width="200" /> | <img src="assets/screenshots/screen_2.jpg" width="200" /> | <img src="assets/screenshots/screen_3.jpg" width="200" /> |

*(실제 앱 구동 화면)*

---

## 🛠 기술 스택

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Database**:
    - Android: `expo-sqlite` (Native SQLite)
    - Web: `localStorage` (Adapter Pattern)
- **File System**: `expo-file-system` (Legacy Import)
- **Notification**: `expo-notifications` (Local Push)
- **Deployment**: Play Store (Android) / Vercel (Web PWA)

## 📁 프로젝트 구조

```
kashimo/
├── src/
│   ├── components/     # 재사용 가능한 UI 컴포넌트
│   ├── screens/        # 화면 (Home, Add, List, Detail, Settings)
│   ├── services/       # 비즈니스 로직
│   │   ├── db/            # ✅ Database Adapters
│   │   │   ├── NativeSQLiteAdapter.native.ts
│   │   │   └── WebLocalStorageAdapter.ts
│   │   ├── database.ts    # Facade Pattern
│   │   ├── backup.native.ts
│   │   └── backup.web.ts
│   │   └── notifications.ts
│   ├── constants/      # 상수 및 설정
│   └── styles/         # 디자인 토큰 (Theme)
├── assets/             # 이미지, 폰트
└── app.json            # Expo 설정
```

---

## 🚀 시작하기

### 1. 설치 및 웹 실행 (iOS/Desktop)

```bash
# 프로젝트 클론
git clone https://github.com/specialMinority/kashimo.git

# 의존성 설치
npm install

# 웹 서버 실행 (PWA 모드)
npx expo start --web
```

### 2. 안드로이드 실행 및 빌드

```bash
# 개발 서버 실행 (Android)
npx expo start --android

# Preview 빌드 (APK 생성)
npx eas-cli build --profile preview --platform android
```

> **Note**: Android 빌드 시 `react-native-reanimated` 호환성 문제 해결을 위해 `patch-package`가 자동으로 실행됩니다.

---

## 📜 라이선스

This project is licensed under the MIT License.
