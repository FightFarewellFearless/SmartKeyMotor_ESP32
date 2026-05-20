import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface AuthScreenProps {
  onAuthenticate: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticate }) => (
  <TouchableOpacity style={styles.authBtn} onPress={onAuthenticate}>
    <Text style={styles.btnText}>Buka Kunci Aplikasi</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  authBtn: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
