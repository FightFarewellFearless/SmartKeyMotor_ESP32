/**
 * @format
 */


import { AppRegistry } from 'react-native';
import { install } from 'react-native-quick-crypto';

install();
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
