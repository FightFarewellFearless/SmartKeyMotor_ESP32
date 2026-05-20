import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HeaderProps {
  status: string;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ status, isConnected }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>SMART KEY</Text>
      <Text
        style={[
          styles.status,
          isConnected ? styles.textGreen : styles.textGray,
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  status: { fontSize: 14, marginTop: 8, fontWeight: '500' },
  textGreen: { color: '#00E676' },
  textGray: { color: '#888888' },
});
