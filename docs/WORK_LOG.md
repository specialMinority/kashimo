# Kashimo 디자인 및 일괄 삭제 작업 기록

## 요청과 범위
- 2026-09-12: GitHub `specialMinority/kashimo`의 기존 기능을 유지하면서 디자인 개편 및 거래 목록 일괄 삭제 구현.
- 사용자 제공 고양이 사진으로 AI 캐릭터 아이콘 생성. 실제 고양이 사진을 화면 배경으로 사용.
- Android 네이티브 앱과 iPhone 홈 화면에 설치하는 웹앱 지원.
- 소스, 빌드 산출물, 검증 결과와 재현 방법을 함께 납품.

## 시작 상태
- 원격 기본 브랜치: `master`. 작업 브랜치: `feature/cat-design-bulk-delete`.
- React Native 0.81.5 / Expo SDK 54 / React 19 / TypeScript.
- 일본어 사용자 화면, JPY 기반 개인 간 대여·차입 기록 앱.
- Android SQLite, 웹 localStorage 어댑터. 기존 데이터 키와 스키마를 유지한다.
- 기존 GitHub Pages `/kashimo/` 배포 및 EAS Android 프로젝트가 존재한다.
- 기존 CONTEXT.md의 색상 고정 규칙은 이번 사용자의 디자인 변경 요청에 따라 새 테마로 갱신한다.

## 구현 방향
- 크림색 바탕, 차분한 녹색 액션, 고양이 실사 배경과 AI 마스코트.
- 목록 선택 모드, 항목별 선택, 현재 필터 결과 전체 선택, 개수 명시 삭제 확인.
- 일괄 삭제는 저장소 단위 원자적 처리 및 삭제 대상 알림 취소를 포함한다.
- 취소, 오류, 빈 목록, 필터 변경, 재시작 후 영속성까지 검증한다.
- 기존 등록/수정/완료/정산 취소/백업 기능을 보존한다. 기존 README의 부분상환 설명은 코드상 별도 기능이 없어 완료로 주장하지 않는다.

## 진행 및 디버깅
- 저장소 복제 및 기존 문서/앱 설정 확인 완료.
- 구현 및 검증 진행 중. 확인하지 않은 실기기 동작이나 배포 성공을 완료로 표시하지 않는다.

## 검증 결과
- TypeScript 검사 통과.
- 저장소/알림/날짜 자동 테스트 15개 통과.
- 웹 프로덕션 export 성공, PWA manifest/서비스 워커 생성 성공.
- 브라우저 통합 테스트 진행 중. 실기기 Android/iPhone 테스트는 아직 하지 않았다.

## 납품
- 작업 완료 시 소스 경로, 웹 URL, Android 빌드, 테스트 명령과 알려진 제한을 기록한다.

## 2026-09-13 디버깅 메모
- npm 의존성 다운로드는 샌드박스 네트워크 제한으로 중단 후 승인된 네트워크 실행으로 완료.
- ImageBackground의 자동 크기가 웹 화면 밖으로 넘침 → 명시적인 백분율 크기의 Image와 루트 overflow 처리.
- 작은 화면의 일본어 헤드라인 줄바꿈 → 뷰포트별 글자 크기 조정.
- Ionicons index import가 모든 폰트를 내보냄 → 직접 Ionicons 모듈 import로 33개 자산을 15개로, JS 번들은 약 2.34 MB에서 1.40 MB로 축소.
- 쓰지 않는 Reanimated 3 및 구버전 Android 패치 제거. 기존 Swipeable은 React Native Animated를 사용하므로 기능 유지.
- 테스트용 TypeScript 로더의 default import 해석 오류 → esModuleInterop 활성화. 실제 앱 오류와 구분.
- 화면 읽기 도구에서 아이콘 글리프가 버튼 이름에 포함됨 → 웹 aria-hidden 및 네이티브 접근성 제외 속성 추가.
- EAS CLI는 로컬 상태 파일의 계정명과 달리 실제 조회 결과 Not logged in. 사용자 로그인 변경 없이 GitHub Actions preview 빌드 경로 채택.
- GitHub Actions APK는 Expo 개발 키로 서명하는 설치/검증용 산출물. Play 배포 서명이나 스토어 제출을 완료한 것으로 주장하지 않는다.

## 기술 참조
- [Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/): manifest 및 서비스 워커 구성을 확인.
- [Expo SQLite SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/): 독점 트랜잭션 API와 롤백 사용.
- 설치된 Expo config 타입에서 experiments.baseUrl 지원을 확인하고 /kashimo 하위 경로에 적용.
