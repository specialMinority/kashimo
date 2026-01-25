# Kashimo - P2P 금전거래 관리 앱

> **カシモ** - 友達との お金、もう忘れない  
> (친구와의 돈, 이제 잊지 않아요)

## 📱 프로젝트 개요

개인 간 금전거래(빌려준 돈/빌린 돈)를 쉽게 기록하고, 반환 기한에 맞춰 자동으로 리마인더를 보내주는 앱입니다.

### 주요 차별점
- ✅ 상대방 앱 설치 불필요 (나만 기록하면 됨)
- ✅ 단계별 자동 알림 (D-7, D-3, D-1, D-Day)
- ✅ LINE 연동 리마인더 메시지
- ✅ 심플한 UI (가계부 기능 없음)

## 🛠 기술 스택

- **Frontend**: React Native + Expo
- **Language**: TypeScript
- **Backend**: Firebase (Firestore, Auth, FCM)
- **Notifications**: Firebase Cloud Messaging + LINE Messaging API

## 📁 프로젝트 구조

```
kashimo/
├── src/
│   ├── components/     # 재사용 가능한 UI 컴포넌트
│   ├── screens/        # 화면 컴포넌트
│   ├── navigation/     # 네비게이션 설정
│   ├── hooks/          # 커스텀 훅
│   ├── services/       # API, Firebase 서비스
│   ├── stores/         # 상태 관리
│   ├── types/          # TypeScript 타입 정의
│   ├── constants/      # 상수
│   ├── styles/         # 디자인 시스템
│   └── utils/          # 유틸리티 함수
├── assets/             # 이미지, 폰트 등
├── app.json            # Expo 설정
└── package.json
```

## 🚀 시작하기

### 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

### Firebase 설정

1. Firebase Console에서 프로젝트 생성
2. `google-services.json` (Android) 다운로드
3. `GoogleService-Info.plist` (iOS) 다운로드
4. 환경 변수 설정 (`.env` 파일)

## 📋 개발 로드맵

- [ ] Phase 1: MVP (4주)
  - [ ] 거래 CRUD
  - [ ] 대시보드
  - [ ] 푸시 알림
- [ ] Phase 2: 핵심 기능 강화 (4주)
  - [ ] LINE 연동
  - [ ] 그룹 정산
  - [ ] 영수증 첨부
- [ ] Phase 3: 성장
  - [ ] 유저 피드백 반영
  - [ ] 마케팅

---

*Created: 2026-01-24*
