import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface EngineButtonProps {
  engineOn: boolean;
  onPress: () => void;
}

export const EngineButton: React.FC<EngineButtonProps> = ({
  engineOn,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.engineBtn,
        engineOn ? styles.engineBtnOff : styles.engineBtnOn,
      ]}
      onPress={onPress}
    >
      <Text style={styles.engineBtnText}>{engineOn ? 'STOP' : 'START'}</Text>
      <Text style={styles.engineSubText}>ENGINE</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  engineBtn: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    borderWidth: 8,
    borderColor: '#1A1A1A',
  },
  engineBtnOn: { backgroundColor: '#00C853' },
  engineBtnOff: { backgroundColor: '#D50000' },
  engineBtnText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  engineSubText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: -5,
  },
});
