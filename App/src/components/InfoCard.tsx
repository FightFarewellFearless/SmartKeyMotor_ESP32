import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const InfoCard: React.FC = () => {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>Status Keamanan</Text>
      <Text style={styles.infoValue}>Terproteksi (Token Aktif)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    marginTop: 40,
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoLabel: { color: '#888', fontSize: 14, marginBottom: 4 },
  infoValue: { color: '#00E676', fontSize: 16, fontWeight: 'bold' },
});
