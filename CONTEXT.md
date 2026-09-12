# Kashimo 현재 작업 맥락

최종 갱신: 2026-09-13 (KST)

## 목표
사용자가 제공한 고양이를 캐릭터 아이콘과 실사 배경으로 사용하는 모던한 디자인, 기존 거래 목록의 일괄 삭제, Android 앱 및 iPhone PWA 납품.

## 소스와 실행
- GitHub: https://github.com/specialMinority/kashimo
- 작업 브랜치: feature/cat-design-bulk-delete
- 로컬: C:/Users/PC/Documents/Playground/kashimo
- Expo SDK 54 / React Native 0.81.5 / React 19 / TypeScript.
- 일본어 UI와 JPY 통화, SQLite / localStorage의 기존 스키마 및 키를 유지한다.
- Node 24, npm ci → npm run typecheck → npm test → npm run build:web.
- npm run preview:web → http://localhost:4173/kashimo/

## 현재 상태
- 고양이 AI 아이콘 및 실제 사진 반영. 크림/녹색 테마.
- 선택 모드, 필터 내 전체 선택, 삭제 개수 확인, 오류/재시도 구현.
- 웹 단일 쓰기 및 SQLite 독점 트랜잭션으로 일괄 삭제 원자성 확보.
- 삭제 후 알림 정리, 실패 알림 재시도. 기존 데이터 손상 시 조용히 덮어쓰지 않는다.
- 외부 아이콘 폰트 의존 제거, 로컬 자산 캐싱 서비스 워커와 iPhone 홈 화면용 manifest 추가.
- 사용하지 않는 Reanimated 및 호환성 패치 제거. 기존 스와이프는 RN Animated 기반으로 유지.
- 자동 테스트 15개 및 브라우저 통합 11개 항목 통과. 실제 Android APK 빌드 성공. 웹 공개 배포 및 실제 URL 스모크 테스트 통과.
- Expo EAS CLI 인증은 Not logged in. GitHub Actions에서 preview APK를 생성한다.

## 반드시 유지할 사항
- 기존 기기 데이터는 삭제하거나 테스트 데이터로 치환하지 않는다. 테스트는 새 로컬 브라우저 컨텍스트에서만 진행.
- 변경 색상은 src/styles/theme.ts 사용. 이번 요청이 이전 색상 고정 규칙을 대체한다.
- 폰트/그림은 앱 내부 번들에 포함하여 오프라인 표시를 보장한다.
- 일괄 삭제에서 알림 실패와 저장 실패를 구분한다. 저장 실패 시 성공 메시지나 목록 제거 금지.
- 앱스토어 제출, 실기기 검증, 사용자 Google 로그인은 실제 수행 여부를 구분해서 기록한다.

## 납품 링크
- 웹앱: https://specialminority.github.io/kashimo/
- 다운로드: https://github.com/specialMinority/kashimo/releases/tag/v1.1.0-preview
- 변경 PR: https://github.com/specialMinority/kashimo/pull/3
- 앱 빌드 소스: 7ea2ef0cdc2697cfcdb44c47d91802c53fcf585d. 이후 커밋은 최종 검증 문서 갱신.

## 상세 기록
- [납품 및 설치 가이드](docs/DELIVERY.md)
- [최종 검증과 APK 서명](docs/FINAL_VERIFICATION.md)
- [작업 및 디버깅](docs/WORK_LOG.md)
- [이미지 생성 프롬프트 및 자산](docs/IMAGE_GENERATION.md)
- [이전 작업 기록](docs/CONTEXT_ARCHIVE.md) — 과거 상태이며 현재 설정과 상충하면 이 문서를 우선한다.
