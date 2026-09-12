# 1.1.0 빌드 및 검증 기록

최신 1.1.1의 Android 아이콘 수정·검증은 [ANDROID_TAB_FIX.md](ANDROID_TAB_FIX.md)를 참고한다. 아래 내용은 1.1.0 납품 당시의 기록이다.

작성일: 2026-09-13 KST

## 납품 대상
- 앱 빌드 소스: `7ea2ef0cdc2697cfcdb44c47d91802c53fcf585d`. 이후 문서 전용 커밋은 앱 실행 코드와 빌드 설정을 변경하지 않는다.
- [웹앱](https://specialminority.github.io/kashimo/)
- [Android APK·웹·소스 다운로드](https://github.com/specialMinority/kashimo/releases/tag/v1.1.0-preview)
- [변경 PR #3](https://github.com/specialMinority/kashimo/pull/3)
- [최종 Android·웹 빌드](https://github.com/specialMinority/kashimo/actions/runs/34702734430): 두 작업 모두 success.

## Android APK
- 파일: `kashimo-1.1.0-preview.apk`
- 크기: 95478974 bytes
- SHA-256: `d1e1c25626a8d1d1191aa1f6385e13bc27ffb3f6a0852e53c10bdc2ae0e3621b`
- Android SDK 공식 `com.android.tools.build:apksig:8.11.0`의 `ApkVerifier`로 디지털 서명 검증 통과.
- v2 서명: true. v1/v3: false. JAR 전용 jarsigner는 이 v2 서명 검증에 사용할 수 없다.
- 인증서: `CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US`.
- 인증서 SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- ZIP CRC 전체 검사 통과. AndroidManifest.xml, classes.dex, JS bundle 포함.
- 앱 자체 네이티브 모듈은 arm64-v8a/x86_64 대상으로 컴파일. 일부 의존성의 32비트 라이브러리도 포함되어 있으나 32비트 지원으로 주장하지 않는다.
- 이 검증은 무결성·서명·컴파일 확인이다. 실제 Android 설치·알림 실행 검증을 대신하지 않는다.

## 자동 검증
- TypeScript: 오류 0.
- 저장소/알림/날짜: 15개 테스트 통과.
- Chrome: 11개 통합 항목 통과. 삭제 취소·필터·전체 삭제·쓰기 실패/재시도·영속성·등록/수정·정산/취소·JSON 백업/복원·오프라인·반응형·오류 확인.
- 실제 공개 주소: HTTP 200, 홈/기록 화면, 이미지, manifest 확인. 새 격리 컨텍스트에서 실행했으며 사용자 데이터는 변경하지 않았다.

## WebKit 보완 검증
- Playwright 1.62.1, WebKit 26.5, Windows.
- Chrome과 동일한 주요 조작 시나리오 8개 통과.
- `context.setOffline(true)` 후 reload는 WebKit 내부 오류로 중단. 통과 결과로 계산하지 않았다.
- 이를 구분하기 위해 별도 서버(4174)를 생성하고 Cache-Control: no-store로 앱을 제공했다. 서비스 워커 활성화·캐시를 확인한 뒤 서버 연결을 모두 닫고 서버를 종료했다. Node fetch가 실패함을 확인한 상태에서 WebKit reload가 성공했고 저장된 거래가 표시되었다.
- 서버 종료 상태에서 320/390/768/1440px 홈/설정 화면에 수평 넘침 없음. 페이지 오류·요청 실패 없음.
- 증거 JSON과 재현 스크립트는 Release의 검증 패키지에 포함한다. 이 결과는 실제 iOS Safari 설치 시험이 아니다.

## 미수행 범위
실제 Android/iPhone 기기 설치 및 장기 사용, 사용자 Google 계정/OAuth 로그인, Google Play 배포 서명과 스토어 제출.

## 참조
- [Android 서명 검증 도구](https://developer.android.com/tools/apksigner)
- [Playwright 오프라인 에뮬레이션](https://playwright.dev/docs/emulation#offline)
