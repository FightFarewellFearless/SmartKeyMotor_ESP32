import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface ConnectionScreenProps {
  isConnecting: boolean;
  isConnected: boolean;
  onRetry: () => void;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({
  isConnecting,
  isConnected,
  onRetry,
}) => {
  if (isConnecting) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loaderText}>Menghubungkan ke Motor...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.failedText}>Koneksi Terputus</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.btnText}>Coba Hubungkan Ulang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loaderContainer: { alignItems: 'center' },
  loaderText: { color: '#BBBBBB', marginTop: 16, fontSize: 16 },
  failedText: { color: '#FF5252', fontSize: 18, fontWeight: 'bold' },
  retryBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 20,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
