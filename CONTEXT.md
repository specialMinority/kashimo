# 🎯 PROJECT CONTEXT: Kashimo (カシモ)

> **역할**: 이 문서는 AI 어시스턴트가 프로젝트 작업을 이어받을 때 즉시 컨텍스트를 파악할 수 있도록 돕는 "세이브 포인트" 역할을 합니다.
> 
> **사용법**: 작업 시작 전 이 파일을 읽고, 작업 완료 후 상태를 업데이트하세요.

---

## 📌 프로젝트 메타데이터

| 항목 | 값 |
|------|-----|
| **프로젝트명** | Kashimo (カシモ) |
| **상태** | `✅ 개발 완료 - Phase 2 (Local Migration) & Verified` |
| **마지막 업데이트** | 2026-01-26 02:30 KST |
| **프로젝트 경로** | `c:\Users\PC\.gemini\antigravity\scratch\kashimo` |
| **기획서 경로** | `C:\Users\PC\.gemini\antigravity\brain\b215a033-abf2-4ea5-80f3-7eb01deabf38\implementation_plan.md` |

---

## 1. 🎯 최상위 목표 (High-Level Goal)

### 한 문장 설명
> **일본 시장을 타겟으로 한 개인 간 금전거래(빌려준 돈/빌린 돈) 관리 앱.**
> **Android는 앱으로, iOS는 웹(PWA)으로. 어디서든 내 데이터는 안전하게.**

### 핵심 차별점
- ✅ **Hybrid 전략 (Native Android + Web PWA)**
- ✅ **완전한 프라이버시 (로컬 저장소 사용)**
- ✅ 상대방 앱 설치 불필요 (나만 기록)
- ✅ 단계별 자동 알림 (D-7, D-3, D-1, D-Day)

### 완료 조건 (Definition of Done)
- [ ] Android 앱 스토어 출시
- [x] iOS용 웹(PWA) 배포 완료
- [x] 거래 CRUD 기능 동작 (SQLite/WebStorage)
- [x] 로컬 푸시 알림 동작
- [x] 데이터 백업/복구 (JSON 파일)
- [ ] 프리미엄 결제 기능 동작

---

## 2. ⚠️ 핵심 규칙 및 제약사항 (Core Rules)

### 🚫 Do NOT Touch
| 카테고리 | 규칙 |
|----------|------|
| **프레임워크** | React Native + Expo만 사용 (Native 코드 최소화) |
| **언어** | TypeScript 필수, JavaScript 파일 금지 |
| **스타일** | 디자인 토큰(`src/styles/theme.ts`)만 사용, 하드코딩 금지 |
| **색상** | Primary: `#4ECDC4`, Accent: `#FF6B6B` 고정 |
| **백엔드** | **사용 안 함 (Offline-First)**. 데이터는 SQLite에 저장. |
| **인증** | **사용 안 함**. 별도 로그인 없이 즉시 사용. |
| **테스트** | PR 전 TypeScript 컴파일 에러 0개 필수 |

### ✅ Must Follow
- 모든 컴포넌트는 `src/components/`에 생성
- 타입은 `src/types/index.ts`에 정의
- 상수는 `src/constants/index.ts`에 정의
- DB 관련 로직은 `src/services/database.ts`에 집중

---

## 3. 💾 현재 상태 (The Save Point)

### 🔴 활성 태스크
```
없음 - Phase 2 (Local Migration) & GitHub Version Control 완료! 🚀
다음 단계: Phase 3 검증 및 스토어 출시 준비
```

### ✅ 마지막 완료된 액션
```
[2026-01-26 23:45] Phase 3.5 마무리 및 웹 UI 최적화 완료
1. **React Error #310 해결**: HomeScreen의 Hook 호출 순서 위반 문제를 수정하여 화이트 스크린 크래시 해결.
2. **웹 레이아웃 최적화**: 모바일 브라우저에서 하단 탭 바가 잘리는 현상을 해결 (높이 85px, 패딩 15px로 조정).
3. **기능 복구**: GestureHandlerRootView 설정을 통해 웹용 스와이프(Swipeable) 기능 정상화.
4. **런타임 안정성**: ErrorBoundary를 도입하여 앱 예외 발생 시 피드백 제공.
```

### ⏭️ 다음 단계 (When Resumed)
```
Phase 3: Web Support (iOS Alternative)
1. [x] DB 로직 리팩토링 (Native vs Web 분기 처리)
2. [x] Web용 저장소 어댑터 (localStorage/IndexedDB) 구현
3. [x] PWA 배포 (Netlify) 및 iPhone 홈 화면 추가 테스트
```

---

## 4. 📋 개발 체크리스트 (Backlog)

> **체크리스트 읽는 법**
> - `[ ]` 미완료 / `[x]` 완료
> - **DoD**: Definition of Done (완료 정의)
> - **✅ 검증**: 완료 확인을 위한 테스트 방법

---

### 🔥 Phase 2: Local Migration (1주) - 완료 ✅
> **Goal**: Firebase 의존성을 제거하고 완전한 오프라인 앱으로 전환

<details>
<summary><b>[x] SQLite 설정 및 DB 서비스 구현</b></summary>

**DoD**:
- `expo-sqlite` 설치
- `transactions` 테이블 생성 (id, amount, type, counterparty, dueDate, status, memo, createdAt, completedAt)
- CRUD 함수 (`add`, `get`, `update`, `delete`, `summary`) 구현

**✅ 검증 방법**:
- 앱 실행 시 에러 없이 DB 초기화 로그 출력
- 더미 데이터 CRUD 동작 확인
</details>

<details>
<summary><b>[x] 화면 마이그레이션</b></summary>

**DoD**:
- 모든 화면에서 `firestore.ts` 대신 `database.ts` 사용
- 데이터 로딩 속도 개선 확인 (로컬이라 즉시 반응)

**✅ 검증 방법**:
- 거래 추가 후 홈/목록 즉시 반영 확인
- 기존 Firebase 관련 코드 잔재 없음 확인
</details>

<details>
<summary><b>[x] 백업 및 복구 시스템</b></summary>

**DoD**:
- `src/services/backup.ts` 구현
- 전체 거래 내역 JSON Export 및 Share
- JSON Import 및 DB 덮어쓰기 복구

**✅ 검증 방법**:
- 데이터 생성 -> 백업 -> 데이터 삭제 -> 복구 -> 데이터 복원 확인
</details>

<details>
<summary><b>[x] Firebase 제거 및 클린업</b></summary>

**DoD**:
- `package.json`에서 firebase 제거
- `src/services/firebase.ts` 등 파일 삭제
- 앱 빌드 사이즈 감소 확인

**✅ 검증 방법**:
- `npm start` 시 경고 메시지 없음 확인
</details>

---

### 🔶 Phase 3: 고도화 및 검증 (2주)

#### 데이터 안정성 검증
- [ ] **백업/복구 스트레스 테스트**
    - [ ] 대량 데이터(100GB급 가상) 생성 후 백업 생성
    - [ ] 백업 파일 변조 시도 후 복구 실패 처리 확인
    - [ ] 앱 삭제 후 재설치 -> 복구 시나리오 검증
- [ ] **버전 호환성 체크**
    - [ ] DB 스키마 변경 시 마이그레이션 전략 수립 (`user_version` PRAGMA 활용)

#### Android/iOS 실기기 테스트
- [ ] **Android**: 다양한 OS 버전(10~14) 테스트, 뒤로가기 버튼 핸들링
- [ ] **iOS**: 시뮬레이터 및 TestFlight 배포, 노치/다이내믹 아일랜드 UI 대응
- [ ] **권한**: 알림, 파일 접근 권한 거부 시 UX 시나리오 점검

---

### 🚀 Phase 4: 스토어 출시 준비 (Release)

#### 스토어 필수 항목 준비
- [ ] **Android (Play Store)**
    - [ ] Google Play Console 개발자 계정 생성 ($25)
    - [ ] 앱 정보 입력 (이름: Kashimo - カシモ, 설명, 스크린샷 1242x2208, 1242x2688)
    - [ ] 개인정보처리방침(Privacy Policy) URL 생성 및 등록
    - [ ] 데이터 보안 폼 작성 (오프라인 앱이므로 수집 데이터 '없음'으로 처리 가능)
- [ ] **iOS (App Store)**
    - [ ] Apple Developer Program 등록 ($99/year)
    - [ ] App Store Connect 앱 생성
    - [ ] 수출 규정 준수 정보(Export Compliance) 처리

#### 최종 빌드 및 제출
- [ ] **프로덕션 빌드 생성**
    ```bash
    eas build --platform all --profile production
    ```
- [ ] **앱 서명(Signing)** 관리 (Expo EAS Credentials 활용)
- [ ] **심사 제출**
    - [ ] Android: 내부 테스트 -> 프로덕션 트랙 출시
    - [ ] iOS: TestFlight -> 심사 제출

---

### 🔵 Phase 5: 성장 (Ongoing)
- [ ] 유저 피드백 수집 채널 (이메일/트위터)
- [ ] 다국어 지원 (한국어/일본어/영어)
- [ ] 프리미엄 기능 (광고 제거 등) 기획및 경로 DB 연결

---

## 5. 📚 지식 베이스 (Knowledge Base)

### 기술적 결정사항
| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-01-25 | **Local-First (SQLite)** | 개인 금융 데이터의 프라이버시 중시, 서버 비용 절감, 오프라인 사용성 극대화, 일본 시장의 보수적 성향 반영 |
| 2026-01-25 | JSON 백업 | 클라우드 계정 연동 없이도 가장 직관적이고 이식성 높은 데이터 보존 방식 |
| 2026-01-24 | Expo 사용 | iOS/Android 동시 개발, OTA 업데이트, 빠른 개발 |
| 2026-01-24 | TypeScript 필수 | 타입 안정성, 리팩토링 용이, 협업 시 실수 방지 |
| 2026-01-26 | **Expo FileSystem Legacy** | `expo-file-system` v19+에서는 `StorageAccessFramework`가 `expo-file-system/legacy`로 분리됨. `import *` 사용 시 네임스페이스 로딩 실패 이슈 발생하여 **명시적 import** 사용 필수. |
| 2026-01-26 | **EAS Build Limit** | Free Plan의 Android 빌드 한도 도달. 로컬 빌드 환경(Android Studio)이 없다면 Expo Go로 검증해야 함. |
| 2026-01-26 | **Pivot to Web (iOS)** | iOS 앱 심사 및 배포 비용($99) 대비 효율성을 위해 iOS는 PWA(웹)로 전환. Android는 Native 유지. |
217: | 2026-01-26 | **React Hook Rules** | `if (loading)` 문 뒤에 `useState`를 두어 Error #310 발생. 모든 Hook은 조건문 없이 최상단에 배치해야 함을 확인. |
218: | 2026-01-26 | **Web Layout Gap** | 모바일 웹 브라우저의 하단바 영역으로 인해 Bottom Tab이 짤림. 85px 이상의 높이와 적절한 패딩 분배가 필요함. |

### 일본 시장 인사이트
| 날짜 | 정보 |
|------|------|
| 2026-01-24 | 일본인은 "독촉"을 극도로 꺼림 → 앱이 대신 알려주는 컨셉 |
| 2026-01-24 | LINE이 압도적 메신저 → LINE 연동 필수 |
| 2026-01-24 | PayPay/LINE Pay로 즉시 정산 문화 → 기한 관리가 차별점 |

### 경쟁 앱 분석
| 앱 | 강점 | 약점 |
|----|------|------|
| casicari | 일본 대표 앱, 푸시 알림 | - |
| Money Reminder | 독촉 심리 해결 | UI가 올드함 |
| 貸し借り管理 | 심플한 UI | 알림 기능 약함 |

---

## 6. 🏗️ 아키텍처 / 파일 구조

```
kashimo/
├── src/
│   ├── components/         # 재사용 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── TransactionItem.tsx
│   │   └── ...
│   │
│   ├── screens/            # 화면 컴포넌트
│   │   ├── HomeScreen.tsx      # 대시보드 (Local DB)
│   │   ├── AddScreen.tsx       # 거래 등록
│   │   ├── ListScreen.tsx      # 거래 목록
│   │   ├── DetailScreen.tsx    # 거래 상세
│   │   ├── EditScreen.tsx      # 거래 수정
│   │   └── SettingsScreen.tsx  # 설정 (백업/복구 UI 포함)
│   │
│   ├── navigation/         # 네비게이션 설정
│   │   └── TabNavigator.tsx
│   │
│   ├── hooks/              # 커스텀 훅
│   │   ├── useTransactions.ts
│   │   └── useNotifications.ts
│   │
│   ├── services/           # ✅ 서비스 레이어
│   │   ├── database.ts         # ✅ SQLite DB 관리 (Core)
│   │   ├── backup.ts           # ✅ JSON 백업/복구
│   │   ├── notifications.ts    # 로컬 푸시 알림
│   │   └── index.ts            # Export
│   │
│   ├── stores/             # 상태 관리 (Zustand 예정)
│   │
│   ├── types/              # TypeScript 타입
│   │   └── index.ts
│   │
│   ├── constants/          # 상수 정의
│   │   └── index.ts
│   │
│   ├── styles/             # 디자인 시스템
│   │   ├── theme.ts
│   │   └── index.ts
│   │
│   └── utils/              # 유틸리티 함수
│
├── assets/                 # 이미지, 폰트
├── app.json               # Expo 설정
├── App.tsx                # 앱 진입점
├── README.md              # 프로젝트 문서
├── CONTEXT.md             # ✅ 이 파일
└── package.json
```

---

## 7. 📝 진행 로그 (Progress Log)

> 최신 항목이 위에 오도록 역순 정렬

### 2026-01-25

#### 12:50 - Phase 2 마이그레이션 완료 ✅ 🚀
- **작업자**: AI Assistant
- **작업 내용**:
  - `expo-sqlite` 기반 로컬 DB 아키텍처 구축 완전 전환
  - 모든 서비스 로직을 `firestore` -> `database`로 변경
  - `exportData`, `importData` 백업 유틸리티 구현
  - Firebase 관련 코드 완전 삭제
- **결과**: 앱 사이즈 감소, 속도 향상, 완전한 오프라인 동작 달성

#### [2026-01-26] Phase 2 검증 및 핫픽스 (Android) ✅
- **작업자**: AI Assistant
- **이슈 해결**:
  1.  **빌드 에러**: React Native 0.81 + Reanimated v3 호환성 문제 -> `patch-package`로 자바 코드(`BorderRadiiDrawableUtils.java`) 수정하여 해결.
  2.  **런타임 에러**: `FileSystem.StorageAccessFramework is undefined` -> `expo-file-system/legacy`에서 명시적 import 구문으로 변경하여 해결 (`import { StorageAccessFramework } ...`).
  3.  **빌드 한도**: EAS Build 한도 초과 -> **Expo Go** 개발 서버(`npx expo start`)를 통해 기능 검증 완료.
- **결과**: 백업/복구 기능의 Android 폴더 선택(SAF)이 정상 동작함을 확인.

#### 12:35 - UX 개선 및 제스처 기능 추가
- **작업자**: AI Assistant
- **작업 내용**:
  - Swipe Action 추가 (삭제/수정/완료)
  - 날짜 입력 UX 개선 (8자리 숫자)
  - Undo(정산 취소) 기능 추가

#### 11:18 - Phase 1 MVP 완료
- **초기 버전 개발 완료** (Firebase 기반)

### 2026-01-24

#### 07:15 - Phase 1 Week 2 주요 화면 구현 완료 ✅
- **작업자**: AI Assistant
- **작업 내용**:
  - 필수 패키지 설치 (react-navigation, firebase, vector-icons)
  - `src/services/firebase.ts` Firebase SDK 설정
  - `src/services/firestore.ts` CRUD 함수 구현
  - `src/navigation/TabNavigator.tsx` 4개 탭 네비게이터
  - `src/screens/HomeScreen.tsx` 대시보드 (받을 돈/갚을 돈 카드)
  - `src/screens/ListScreen.tsx` 거래 목록 (필터링, 상태별 표시)
  - `src/screens/AddScreen.tsx` 거래 등록 폼
  - `src/screens/SettingsScreen.tsx` 알림 설정 화면
  - `App.tsx` 앱 진입점 업데이트
  - `npx tsc --noEmit` 컴파일 성공 확인
- **결과**: 주요 UI 구현 완료, Mock 데이터로 동작 확인 가능

#### 07:45 - Firebase 실제 연동 완료 ✅ 🔥
- **작업자**: AI Assistant + 사용자
- **작업 내용**:
  - 사용자: Firebase Console에서 `kashimo-web` 프로젝트 생성
  - 사용자: Firestore Database 활성화
  - AI: `src/services/firebase.ts`에 실제 credentials 적용
  - AI: 화면들을 실제 Firestore에 연결 (HomeScreen, ListScreen, AddScreen)
  - AI: 인덱스 문제 해결 (클라이언트 사이드 정렬로 변경)
  - AI: undefined 필드 문제 해결 (Firebase는 undefined 허용 안함)
  - 테스트: 거래 등록 → Firebase 저장 성공
  - 테스트: 홈 화면에서 ¥10,000 표시 확인
- **결과**: 앱이 실제 Firebase와 연동되어 데이터 저장/조회 가능

#### 2. Project Status
- **Phase 1 (MVP)**: Completed (UI, Basic Logic).
- **Phase 2 (Local DB)**: Completed (SQLite Migration, Backup).
- **Phase 3 (Web Support)**: Completed (PWA, Web Adapters, Deployment).
- **Phase 3.5 (Enhancements)**: Completed (Web Polish, Notifications, deployment fixes).
- **Current Focus**: Phase 4 (Store Release).

## 3. Tech Stack
- **Framework**: React Native (Expo).
- **Database**:
    - Mobile: `expo-sqlite` (Local).
    - Web: `localStorage` / `IndexedDB` (Adapter Pattern).
- **Navigation**: React Navigation v7 (Native Stack + Bottom Tabs).
- **Styling**: Standard StyleSheet (Theme System).
- **Icons**: Ionicons (@expo/vector-icons) with CDN fallback for Web.
- **Deployment**: Netlify (Web), EAS Build (Android).

## 4. Recent Changes (Phase 3 & 3.5)
- **Web Compatibility**:
    - Implemented `WebDatabase` adapter for seamless cross-platform logic.
    - Added `CustomAlertModal` to replace native alerts on Web.
    - Fixed font loading issues (Infinite loading, missing icons) using safe loading + CDN patch.
    - Forced visible Back Button on Web headers.
- **Deployment**:
    - Successfully deployed PWA to Netlify.
    - Configured `app.json` for proper Web Favicon and Metadata.
- **Features**:
    - Notification system with Reminder toggles.
    - Backup/Restore functionality (JSON file-based).
#### 15:55 - Phase 1 Week 2 & Week 3 완료 ✅ 🎉
- **작업자**: AI Assistant
- **작업 내용**:
  - **Week 2 완료**:
    - DetailScreen.tsx 생성 (상세 정보, 정산완료/삭제 버튼)
    - EditScreen.tsx 생성 (거래 수정 폼)
    - Stack Navigator 추가 (탭 → 상세 → 수정 네비게이션)
    - useFocusEffect 적용 (탭 전환 시 데이터 자동 새로고침)
  - **Week 3 완료**:
    - expo-notifications, expo-device, AsyncStorage 설치
    - notifications.ts 서비스 생성 (알림 권한, 스케줄링, 취소)
    - App.tsx: 앱 시작 시 알림 권한 요청
    - AddScreen: 거래 등록 시 알림 자동 스케줄링 (D-7, D-3, D-1, D-Day)
    - DetailScreen: 삭제/정산완료 시 알림 취소
- **결과**: CRUD + 자동갱신 + 푸시알림 구현 완료, TypeScript 컴파일 에러 0개

#### 06:55 - 초기 설정 완료 ✅
- **작업자**: AI Assistant
- **작업 내용**:
  - `npx create-expo-app` 으로 프로젝트 생성
  - `src/` 폴더 구조 생성
  - `src/styles/theme.ts` 디자인 토큰 정의
  - `src/types/index.ts` TypeScript 타입 정의
  - `src/constants/index.ts` 상수 정의
  - `app.json` 앱 설정 (이름, 색상, 패키지 ID)
  - `README.md` 프로젝트 문서 작성
- **결과**: 개발 착수 준비 완료

#### 06:46 - 기획서 승인 ✅
- **작업자**: 사용자
- **작업 내용**: `implementation_plan.md` 기획서 "LGTM" 승인

#### 06:36 - 일본 시장 조사 완료 ✅
- **작업자**: AI Assistant
- **작업 내용**:
  - 일본 P2P 금전거래 앱 시장 조사
  - 경쟁 앱 5개 분석 (casicari, Money Reminder 등)
  - 차별화 포인트 도출
- **결과**: 시장 진입 가능성 확인, 기획서 작성 착수

---

## 🔄 이 파일 업데이트 규칙

1. **작업 시작 시**: "활성 태스크" 섹션 업데이트
2. **작업 완료 시**: 
   - 체크리스트에서 `[ ]` → `[x]` 변경
   - "마지막 완료된 액션" 업데이트
   - "진행 로그"에 새 항목 추가
3. **새로운 결정 시**: "지식 베이스"에 추가
4. **구조 변경 시**: "아키텍처" 섹션 업데이트
5. **메타데이터**: 상태와 마지막 업데이트 날짜 항상 갱신

---

*이 문서는 AI 어시스턴트가 프로젝트를 이어받을 때 참조하는 핵심 컨텍스트입니다.*
