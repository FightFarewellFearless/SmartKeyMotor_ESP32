import { PermissionsAndroid, Platform } from 'react-native';
import Crypto from 'react-native-quick-crypto';
import BleManager from 'react-native-ble-manager';

export const MAC_ADDRESS = 'b0:cb:d8:e8:6d:5a'.toUpperCase();
export const SERVICE_UUID = '9cae3fec-f446-4ebe-8e4f-6bc5e1b91416';
export const SEND_ENGINE_CHARACTERISTIC_UUID =
  '9f0d261f-98c4-467b-a42f-8603eb27ec43';
export const CHALLENGE_CHARACTERISTIC_UUID =
  'e8146e19-5a33-44f7-8b70-610ae54e816b';
export const TIMEBYPASS_CHARACTERISTIC_UUID =
  '61bdaa99-df7e-427c-b3fe-151e82abbd04';

export const stringToBytes = (string: string) => {
  return Array.from(string).map(c => c.charCodeAt(0));
};

export const bytesToString = (bytes: number[]) => {
  return bytes.map(byte => String.fromCharCode(byte)).join('');
};

export async function setupBle() {
  const hasPermissions = await requestBluetoothPermissions();
  if (hasPermissions) {
    await BleManager.start({ showAlert: false });

    if (Platform.OS === 'android') {
      try {
        await BleManager.enableBluetooth();
      } catch {
        console.log(
          'User menolak menyalakan Bluetooth atau fitur tidak didukung',
        );
      }
    }
    return true;
  }
  return false;
}

export const connectAndPair = async (
  setStatus: (status: string) => void,
): Promise<boolean> => {
  try {
    setStatus('Mencari Motor...');
    
    // PERBAIKAN 1: Pindai (Scan) secara eksplisit selama 1 detik 
    // agar perangkat masuk ke active cache Bluetooth OS.
    await BleManager.scan({
      serviceUUIDs: [SERVICE_UUID],
      seconds: 1,
      allowDuplicates: false,
    });
    
    // PERBAIKAN 2: Terhubung ke Motor (Kini akan instan karena ada di cache)
    await BleManager.connect(MAC_ADDRESS);
    await BleManager.requestMTU(MAC_ADDRESS, 120);

    setStatus('Mengamankan Koneksi...');
    
    // PERBAIKAN 3: Cek status bonding. Hanya panggil createBond jika belum terikat.
    const bondedPeripherals = await BleManager.getBondedPeripherals();
    const isBonded = bondedPeripherals.some(p => p.id.toUpperCase() === MAC_ADDRESS.toUpperCase());
    
    if (!isBonded) {
      await BleManager.createBond(MAC_ADDRESS);
    }

    await BleManager.retrieveServices(MAC_ADDRESS);

    // PERBAIKAN 4: Hapus setTimeout(1000) buatan yang memperlambat flow.
    
    setStatus('Terhubung');
    return true;
  } catch (error) {
    console.error('Connection failed', error);
    BleManager.disconnect(MAC_ADDRESS);
    setStatus('Koneksi Gagal');
    return false;
  }
};

export async function isEngineOn() {
  return await BleManager.read(
    MAC_ADDRESS,
    SERVICE_UUID,
    SEND_ENGINE_CHARACTERISTIC_UUID,
  )
    .then(bytesToString)
    .then(str => str === 'true');
}

export async function startEngineNotification() {
  await BleManager.startNotification(
    MAC_ADDRESS,
    SERVICE_UUID,
    SEND_ENGINE_CHARACTERISTIC_UUID,
  );
}

export async function refreshToken() {
  const challengeData = await requestChallenge();
  if (challengeData.type === 'challenge') {
    const nonce = solveChallenge(challengeData.value);
    const token = await sendChallenge(challengeData.value, nonce);
    return token.split('|')[1];
  } else if (challengeData.type === 'token') {
    return challengeData.value;
  }
}

export async function requestChallenge() {
  const data = await BleManager.read(
    MAC_ADDRESS,
    SERVICE_UUID,
    CHALLENGE_CHARACTERISTIC_UUID,
  );
  const str = bytesToString(data);
  console.log(str);
  if (str.startsWith('challenge|'))
    return { type: 'challenge', value: str.split('|')[1] };
  if (str.startsWith('token|'))
    return { type: 'token', value: str.split('|')[1] };
  throw new Error('Data tidak valid dari ESP32');
}

export async function sendChallenge(challenge: string, nonce: string) {
  const input = challenge + '|' + nonce.toString();
  await BleManager.write(
    MAC_ADDRESS,
    SERVICE_UUID,
    CHALLENGE_CHARACTERISTIC_UUID,
    stringToBytes(input),
    120,
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  const tokenData = await BleManager.read(
    MAC_ADDRESS,
    SERVICE_UUID,
    CHALLENGE_CHARACTERISTIC_UUID,
  );
  return bytesToString(tokenData);
}

export function solveChallenge(challenge: string, difficulty = 3) {
  let nonce = 0;
  const target = '0'.repeat(difficulty);

  while (true) {
    const input = challenge + nonce.toString();
    const hash = Crypto.createHash('sha256').update(input).digest('hex');

    if (hash.startsWith(target)) {
      return nonce.toString();
    }
    nonce++;
  }
}

export const sendMessage = async (
  inputText: string,
  CHARACTERISTIC_UUID: string,
) => {
  try {
    const dataToSend = stringToBytes(inputText);
    await BleManager.write(
      MAC_ADDRESS,
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      dataToSend,
    );
  } catch (error) {
    console.error('Send failed', error);
    throw error;
  }
};

export const requestBluetoothPermissions = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      return (
        result['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
};

export async function syncTime() {
  const token = await refreshToken();
  await BleManager.write(
    MAC_ADDRESS,
    SERVICE_UUID,
    TIMEBYPASS_CHARACTERISTIC_UUID,
    stringToBytes('sync' + token + '|' + Math.floor(Date.now() / 1000).toString()),
    120,
  );
}

export async function setBypassTime(time: number) {
  const token = await refreshToken();
  await BleManager.write(
    MAC_ADDRESS,
    SERVICE_UUID,
    TIMEBYPASS_CHARACTERISTIC_UUID,
    stringToBytes('setbypasstime' + token + '|' + time.toString()),
    120,
  );
}

export async function getBypassTime() {
  const data = await BleManager.read(
    MAC_ADDRESS,
    SERVICE_UUID,
    TIMEBYPASS_CHARACTERISTIC_UUID,
  );
  const str = bytesToString(data);
  return Number(str);
}
