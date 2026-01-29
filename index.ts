import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';

// Web 환경에서 OAuth 리디렉션 응답을 처리하기 위해 진입점에 필수적으로 필요합니다.
WebBrowser.maybeCompleteAuthSession();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
