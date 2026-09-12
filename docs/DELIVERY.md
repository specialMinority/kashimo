# Kashimo 1.1.0 설치 및 납품 안내

## 웹앱 / iPhone
- 실행 주소: https://specialminority.github.io/kashimo/
- iPhone Safari에서 열기 → 공유 → **홈 화면에 추가**.
- 최초 온라인 로딩 후 앱 파일을 저장하면 오프라인에서도 거래를 등록·수정·삭제할 수 있다.
- 업데이트가 보이지 않으면 열려 있는 카시모 탭/홈 화면 앱을 모두 닫은 뒤 다시 연다. 서비스 워커는 사용 중인 버전을 임의로 교체하지 않는다.
- 자동 예약 알림은 Android 앱 기능이다. 웹에서는 앱을 열어 기한을 확인한다.

## Android
- GitHub Releases의 **Kashimo 1.1.0 Preview**에서 APK를 내려받는다.
- 파일을 열어 Android의 설치 안내를 따른다. arm64-v8a / x86_64용 APK다.
- 이 파일은 Release 모드로 번들링되지만 Expo 개발 키로 서명한 설치/검증용 APK다.
- 기존 설치본과 서명이 다르면 바로 업데이트할 수 없다. 기존 앱을 제거하기 전에 설정에서 JSON 백업을 반드시 저장하고 새 설치 후 복원한다.
- Google Play 배포에는 소유자의 EAS/배포 서명으로 별도 빌드가 필요하다.

## 일괄 삭제
1. **記録** 탭에서 **選択**을 누른다.
2. 거래를 개별 선택하거나 **すべて選択**으로 현재 필터의 거래를 선택한다.
3. **選択した取引を削除**를 누르고 건수를 확인한 뒤 삭제한다.
4. 취소하면 기록과 선택이 유지된다. 필터를 바꾸면 선택은 초기화된다.
5. 전체 목록을 지우려면 **すべて** 필터에서 전체 선택한다. 정산 완료 기록도 포함된다.

## 보존한 기능
거래 등록·수정, 대여/차입 필터, 정산 완료/취소, 스와이프 및 메뉴 조작, Android 로컬 알림, JSON 백업/복원, 기존 Google Drive 연결 코드.

Google Drive 로그인은 사용자의 계정과 기존 OAuth 설정을 필요로 하며 이번 검증에서 사용자의 Google 계정 로그인은 실행하지 않았다. 기존 README에 적힌 별도의 부분상환 기록 기능은 원본 코드에 없어 새로 구현했다고 주장하지 않는다.

## 검증
- TypeScript 오류 0개.
- 저장소·알림·날짜 테스트 15개 통과.
- Chrome 브라우저 통합 검증 11개 항목 통과: 선택/필터/전체 삭제, 취소, 저장 실패 및 재시도, 재시작 후 데이터/합계, 등록/편집, 정산 완료/취소, JSON 백업·복원, 오프라인 재시작, 반응형 레이아웃, 런타임 오류 없음.
- 320 / 390 / 768 / 1440px 스크린샷 확인.
- GitHub Actions의 실제 Android APK 컴파일 성공.
- 실제 배포 URL에서 HTTP 200, 화면, 이미지, PWA manifest, 기록 탭 확인.
- 실제 Android/iPhone 기기에서 설치 및 장기 사용 시험은 수행하지 않았다.

## 개발 재현
Node.js 24와 Google Chrome을 사용한다.

```sh
npm ci
npm run typecheck
npm test
npm run build:web
npm run preview:web
# 다른 터미널에서
npm run test:e2e
```

웹 빌드의 루트 파일은 `dist/index.html`이다. 빌드 자산은 기존 `/kashimo/` 하위 경로를 사용한다. GitHub Pages 배포 시 `dist`의 내용 전체와 `.nojekyll`을 포함한다.

## 맥락 기록
- [현재 맥락](../CONTEXT.md)
- [작업 및 디버깅 기록](WORK_LOG.md)
- [AI 이미지 프롬프트와 저장 경로](IMAGE_GENERATION.md)
- [이전 기록](CONTEXT_ARCHIVE.md)

