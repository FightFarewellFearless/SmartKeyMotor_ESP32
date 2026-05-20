import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Alert,
} from 'react-native';

interface BypassCardProps {
  bypassTimestamp: number;
  currentTick: number;
  onSetBypass: (d: number, h: number, m: number) => Promise<void>;
  onDeleteBypass: () => Promise<void>;
}

export const BypassCard: React.FC<BypassCardProps> = ({
  bypassTimestamp,
  currentTick,
  onSetBypass,
  onDeleteBypass,
}) => {
  const [inputDays, setInputDays] = useState('');
  const [inputHours, setInputHours] = useState('');
  const [inputMinutes, setInputMinutes] = useState('');

  const formatBypassDisplay = (epochSeconds: number) => {
    if (epochSeconds <= currentTick) {
      return 'Mati (Tidak Aktif)';
    }

    const date = new Date(epochSeconds * 1000);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `Aktif s/d: ${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleSetBypass = async () => {
    Keyboard.dismiss();
    const d = parseInt(inputDays || '0', 10);
    const h = parseInt(inputHours || '0', 10);
    const m = parseInt(inputMinutes || '0', 10);

    if (isNaN(d) || isNaN(h) || isNaN(m)) {
      Alert.alert('Invalid', 'Masukkan angka yang valid.');
      return;
    }

    if (d === 0 && h === 0 && m === 0) {
      Alert.alert('Invalid', 'Masukkan minimal 1 menit untuk bypass.');
      return;
    }

    await onSetBypass(d, h, m);
    setInputDays('');
    setInputHours('');
    setInputMinutes('');
  };

  return (
    <View style={styles.bypassCard}>
      <Text style={styles.bypassTitle}>Manajemen Bypass Waktu</Text>
      <Text
        style={[
          styles.bypassStatus,
          bypassTimestamp > currentTick ? styles.textGreen : styles.textGray,
        ]}
      >
        {formatBypassDisplay(bypassTimestamp)}
      </Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Hari</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#555"
            value={inputDays}
            onChangeText={setInputDays}
            maxLength={3}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Jam</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#555"
            value={inputHours}
            onChangeText={setInputHours}
            maxLength={2}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Menit</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#555"
            value={inputMinutes}
            onChangeText={setInputMinutes}
            maxLength={2}
          />
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.deleteBypassBtn}
          onPress={onDeleteBypass}
        >
          <Text style={styles.btnText}>Hapus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.setBypassBtn}
          onPress={handleSetBypass}
        >
          <Text style={styles.btnText}>Set Waktu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bypassCard: {
    marginTop: 20,
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bypassTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  bypassStatus: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  textGreen: { color: '#00E676' },
  textGray: { color: '#888888' },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#121212',
    color: '#FFF',
    width: '100%',
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setBypassBtn: {
    flex: 2,
    backgroundColor: '#00838F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteBypassBtn: {
    flex: 1,
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
