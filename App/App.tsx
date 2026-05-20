import * as rnBiometrics from '@sbaiahmed1/react-native-biometrics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import BleManager from 'react-native-ble-manager';

import {
  bytesToString,
  connectAndPair,
  getBypassTime,
  isEngineOn,
  refreshToken,
  SEND_ENGINE_CHARACTERISTIC_UUID,
  sendMessage,
  setBypassTime,
  setupBle,
  startEngineNotification,
  syncTime,
} from './BLE';

import { AuthScreen } from './src/components/AuthScreen';
import { BypassCard } from './src/components/BypassCard';
import { ConnectionScreen } from './src/components/ConnectionScreen';
import { EngineButton } from './src/components/EngineButton';
import { Header } from './src/components/Header';
import { InfoCard } from './src/components/InfoCard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Menunggu Akses...');
  const [engineOn, setEngineOn] = useState(false);

  const [bypassTimestamp, setBypassTimestamp] = useState(0);
  const [currentTick, setCurrentTick] = useState(() =>
    Math.floor(Date.now() / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTick(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    authenticateUser();
    const dcListener = BleManager.onDisconnectPeripheral(() => {
      setIsConnected(false);
      setStatus('Koneksi Terputus');
    });
    const updateListener = BleManager.onDidUpdateValueForCharacteristic(ev => {
      if (
        ev.characteristic.toLowerCase() ===
        SEND_ENGINE_CHARACTERISTIC_UUID.toLowerCase()
      ) {
        const valueStr = bytesToString(ev.value);
        setEngineOn(valueStr === 'true');
      }
    });

    return () => {
      dcListener.remove();
      updateListener.remove();
    };
  }, []);

  const authenticateUser = async () => {
    const { success } = await rnBiometrics.authenticateWithOptions({
      allowDeviceCredentials: true,
      title: 'Otentikasi Diperlukan',
    });

    if (success) {
      setIsAuthenticated(true);
      startConnection();
    } else {
      setStatus('Akses Ditolak');
      Alert.alert(
        'Akses Terkunci',
        'Gunakan Biometrik/PIN untuk menggunakan Smart Key.',
      );
    }
  };

  const startConnection = async () => {
    setIsConnecting(true);
    setStatus('Menyiapkan Bluetooth...');

    const isReady = await setupBle();
    if (!isReady) {
      setStatus('Izin Bluetooth Ditolak');
      setIsConnecting(false);
      return;
    }

    const success = await connectAndPair(setStatus);
    setIsConnected(success);

    if (success) {
      (async () => {
        setEngineOn(await isEngineOn());
        await syncTime();
        const fetchedBypass = await getBypassTime();
        setBypassTimestamp(fetchedBypass);
        await startEngineNotification();
      })();
    }

    setIsConnecting(false);
  };

  const toggleEngine = async () => {
    try {
      const token = await refreshToken();
      if (!engineOn) {
        await sendMessage('on' + token, SEND_ENGINE_CHARACTERISTIC_UUID);
        setEngineOn(true);
      } else {
        await sendMessage('off' + token, SEND_ENGINE_CHARACTERISTIC_UUID);
        setEngineOn(false);
      }
    } catch {
      Alert.alert(
        'Gagal',
        'Gagal mengirim instruksi ke motor. Pastikan jarak dekat.',
      );
    }
  };

  const handleSetBypass = async (d: number, h: number, m: number) => {
    const totalSecondsToAdd = d * 86400 + h * 3600 + m * 60;
    const currentUnixSeconds = Math.floor(Date.now() / 1000);
    const newTargetTimestamp = currentUnixSeconds + totalSecondsToAdd;

    try {
      await setBypassTime(newTargetTimestamp);
      setBypassTimestamp(newTargetTimestamp);
      setEngineOn(true);
      Alert.alert('Sukses', 'Waktu bypass berhasil disetel.');
    } catch {
      Alert.alert('Error', 'Gagal menyetel bypass time.');
    }
  };

  const handleDeleteBypass = async () => {
    try {
      await setBypassTime(0);
      setBypassTimestamp(0);
      if (engineOn) {
        const token = await refreshToken();
        await sendMessage('off' + token, SEND_ENGINE_CHARACTERISTIC_UUID);
        setEngineOn(false);
      }
      Alert.alert('Sukses', 'Waktu bypass dimatikan.');
    } catch {
      Alert.alert('Error', 'Gagal mematikan bypass time.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <Header status={status} isConnected={isConnected} />

      <ScrollView contentContainerStyle={styles.mainScroll}>
        {!isAuthenticated ? (
          <AuthScreen onAuthenticate={authenticateUser} />
        ) : !isConnected || isConnecting ? (
          <ConnectionScreen
            isConnected={isConnected}
            isConnecting={isConnecting}
            onRetry={startConnection}
          />
        ) : (
          <View style={styles.smartKeyContainer}>
            <EngineButton engineOn={engineOn} onPress={toggleEngine} />
            <InfoCard />
            <BypassCard
              bypassTimestamp={bypassTimestamp}
              currentTick={currentTick}
              onSetBypass={handleSetBypass}
              onDeleteBypass={handleDeleteBypass}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  mainScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  smartKeyContainer: { alignItems: 'center', width: '100%' },
});
