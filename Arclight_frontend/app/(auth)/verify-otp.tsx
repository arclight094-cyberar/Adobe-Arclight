import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api';

export default function VerifyOtp() {
  // DEBUG: Set to false to disable auto-login after OTP verification
  const ENABLE_AUTO_LOGIN = true;
  
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [otp, setOtp] = useState(['', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Get email from params or AsyncStorage
  useEffect(() => {
    const getEmail = async () => {
      if (email) {
        setUserEmail(email);
      } else {
        // Try to get from AsyncStorage
        const storedEmail = await AsyncStorage.getItem('pending_email');
        if (storedEmail) {
          setUserEmail(storedEmail);
        }
      }
    };
    getEmail();
  }, [email]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    // Validate OTP
    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit OTP');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'Email not found. Please sign up again.');
      router.back();
      return;
    }

    setLoading(true);

    try {
      // API Call: POST /auth/verify-otp using API service
      const { response, data } = await apiService.verifyOTP(userEmail, otpCode);

      if (response.ok && data.success === true) {
        // Clear pending email
        await AsyncStorage.removeItem('pending_email');

        // DEBUG: Auto-login can be disabled for testing
        if (ENABLE_AUTO_LOGIN) {
          // OTP verification doesn't return a token, so we auto-login after verification
          // Get password from AsyncStorage (stored during signup for auto-login)
          const storedPassword = await AsyncStorage.getItem('pending_password');
          
          if (storedPassword) {
            try {
              // Auto-login with stored credentials
              const { response: loginResponse, data: loginData } = await apiService.login(userEmail, storedPassword);
              
              // Always clear stored password after attempting login (security)
              await AsyncStorage.removeItem('pending_password');
              
              if (loginResponse.ok && loginData.success === true) {
                // Navigate directly to workspace (token is now stored)
                router.replace('/(app)/home');
                return;
              }
            } catch (loginError) {
              console.error('Auto-login error:', loginError);
              // Password already cleared above
            }
          }
        } else {
          // DEBUG: Auto-login disabled - clear stored password and go to login
          await AsyncStorage.removeItem('pending_password');
        }
        
        // If auto-login fails, disabled, or no password stored, navigate to login
        Alert.alert(
          'Success',
          'OTP verified successfully! Please login to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(auth)/login');
              }
            }
          ]
        );
      } else {
        // Handle error response from backend
        Alert.alert('Error', data.message || 'OTP verification failed. Please try again.');
        // Clear OTP on error
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      // Provide more specific error messages
      if (error.name === 'NetworkError' || error.message?.includes('Network request failed')) {
        Alert.alert(
          'Connection Error',
          `Cannot connect to backend server.\n\n` +
          `Please check:\n` +
          `• Backend server is running (port 4000)\n` +
          `• Correct IP address in constants/api.ts\n` +
          `• Device is on same network\n\n` +
          `See BACKEND_SETUP.md for help.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'Network error. Please check your connection and backend server.');
      }
      
      // Clear OTP on error
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Mask email for display
  const getMaskedEmail = (email: string) => {
    if (!email) return 'your email';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}${'*'.repeat(localPart.length - 1)}@${domain}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Svg width={100} height={100} viewBox="0 0 707.9 631.64">
              <G id="Layer_3">
                <Path
                  d="M856.46,719.56,722.79,488,558.61,772.39a12.25,12.25,0,0,1-.78,1.36l0,.07h0a14.85,14.85,0,0,1-5,4.65l-79.9,46.13H795.82C849.73,824.6,883.42,766.24,856.46,719.56Z"
                  transform="translate(-158.05 -192.95)"
                  fill="#ffffff"
                />
                <Path
                  d="M427.8,706.3a14.71,14.71,0,0,1,1.54-6.63h0l0,0a13.16,13.16,0,0,1,.84-1.46l207-358.46L572.64,228c-26.95-46.69-94.33-46.69-121.28,0L167.54,719.56c-27,46.68,6.73,105,60.64,105H427.8Z"
                  transform="translate(-158.05 -192.95)"
                  fill="#ffffff"
                />
              </G>
            </Svg>
            <Text style={styles.logoText}>arclight</Text>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.instructionText}>
              Enter the OTP (One-Time Password) sent to
            </Text>
            <Text style={styles.emailText}>{getMaskedEmail(userEmail)}</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyButtonText}>VERIFY</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 1,
    marginTop: 12,
    fontFamily: 'geistmono',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'geistmono',
  },
  emailText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'geistmono',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  otpInput: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 6,
    fontFamily: 'geistmono',
  },
  verifyButton: {
    backgroundColor: '#5B6BB5',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1.2,
    fontFamily: 'geistmono',
  },
});

