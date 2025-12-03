import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

interface ArclightEngineButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export default function ArclightEngineButton({
  onPress,
  disabled = false,
}: ArclightEngineButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={['#1A2340', '#000000', '#0D1525', '#1A2340']}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.engineButton}
      >
        <View style={styles.engineButtonOverlay} />
        <View style={styles.engineButtonContent}>
          <Sparkles size={24} color="#FFF" strokeWidth={2} />
          <View style={styles.engineButtonTextContainer}>
            <Text style={styles.engineButtonText}>Arclight</Text>
            <Text style={styles.engineButtonSubtext}>Engine</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  engineButton: {
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  engineButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(24, 23, 23, 0.05)',
  },
  engineButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 12,
  },
  engineButtonTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  engineButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 20,
  },
  engineButtonSubtext: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 16,
  },
});

