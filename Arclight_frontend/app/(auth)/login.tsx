// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Svg, { G, Path } from 'react-native-svg';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import apiService from '../../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and signup
  const [name, setName] = useState(''); // Only for signup
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth Configuration
  const GOOGLE_CLIENT_ID = 
    Platform.OS === 'android' 
      ? (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '')
      : Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '')
      : (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '');

  // For Android: No redirect URI needed (uses native authentication)
  // For iOS/Web: Need redirect URI
  const redirectUri = Platform.OS === 'android' 
    ? undefined 
    : (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 
       AuthSession.makeRedirectUri({
         scheme: 'arclight',
         path: 'oauth',
       }));

  // Configure Google Auth Request
  const googleAuthConfig: any = {
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  };

  // Only add redirectUri for non-Android platforms
  if (redirectUri && Platform.OS !== 'android') {
    googleAuthConfig.redirectUri = redirectUri;
  }

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig);

  // Handle Google Auth Response
  useEffect(() => {
    if (!response) {
      return;
    }
    
    if (response.type === 'success') {
      const idToken = (response as any).params?.id_token;
      if (idToken) {
        handleGoogleAuthSuccess(idToken);
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      const errorMessage = response.error?.message || 'Google authentication failed. Please try again.';
      Alert.alert('Google Auth Error', errorMessage);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  // ============================================================
  // LOGIN HANDLER
  // Authenticates user and stores JWT token
  // ============================================================
  const handleLogin = async () => {
    // Validate input fields
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // API Call: POST /auth/login using API service
      const { response, data } = await apiService.login(email.trim(), password);

      console.log('Login response:', { ok: response.ok, status: response.status, data });

      if (response.ok && data.success === true) {
        // Token and user data are already stored by apiService
        
        // Show success message and navigate to main app
        Alert.alert(
          'Success',
          'Login successful!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to main workspace/home screen
                router.replace('/(app)/home');
              }
            }
          ]
        );

        // Clear form fields
        setEmail('');
        setPassword('');
      } else {
        // Handle error response from backend
        // Backend returns { status: 'fail'/'error', message: '...' } for errors
        const errorMessage = data.message || data.error?.message || 'Login failed. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
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
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SIGNUP HANDLER
  // Creates new user account and sends OTP
  // ============================================================
  const handleSignUp = async () => {
    // Validate input fields
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    //setLoading(true);

    try {
      // API Call: POST /auth/signup using API service
      const { response, data } = await apiService.signup(name.trim(), email.trim(), password);

      console.log('Signup response:', { ok: response.ok, status: response.status, data });

      if (response.ok && data.success === true) {
        // Store email and password temporarily for OTP verification and auto-login
        await AsyncStorage.setItem('pending_email', email.trim());
        await AsyncStorage.setItem('pending_password', password); // Store for auto-login after OTP
        
        // Clear form fields
        setName('');
        setEmail('');
        setPassword('');
        
        // Navigate directly to OTP verification screen
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email: email.trim() }
        });
      } else {
        // Handle error response from backend
        Alert.alert('Error', data.message || 'Signup failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
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
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CONTINUE BUTTON HANDLER
  // Routes to login or signup based on current mode
  // ============================================================
  const handleContinue = () => {
    if (isSignUp) {
      handleSignUp();
    } else {
      handleLogin();
    }
  };

  // ============================================================
  // TOGGLE BETWEEN LOGIN AND SIGNUP
  // ============================================================
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form fields when toggling
    setName('');
    setEmail('');
    setPassword('');
  };

  // ============================================================
  // GOOGLE AUTH HANDLERS
  // ============================================================
  const handleGoogleAuth = async () => {
    // Check if running in Expo Go (which doesn't support native Google Sign-In)
    if (Constants.appOwnership === 'expo' && Platform.OS !== 'web') {
      Alert.alert(
        'Development Build Required',
        'Google Sign-In requires a development build, not Expo Go.\n\n' +
        'To use Google Sign-In:\n' +
        '1. Build a development build: npx expo prebuild\n' +
        '2. Run: npx expo run:android\n' +
        '3. Or use EAS Build: eas build --profile development --platform android\n\n' +
        'Expo Go does not support native Google Sign-In.'
      );
      return;
    }
    
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === '') {
      Alert.alert(
        'Configuration Error',
        `Google OAuth Client ID is not configured for ${Platform.OS}.\n\n` +
        `Please add the following to your .env file:\n` +
        `- EXPO_PUBLIC_GOOGLE_${Platform.OS === 'android' ? 'ANDROID' : Platform.OS === 'ios' ? 'IOS' : 'WEB'}_CLIENT_ID\n` +
        `- Or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as fallback\n\n` +
        `See GOOGLE_AUTH_COMPLETE_SETUP.md for detailed instructions.`
      );
      return;
    }

    if (!request) {
      Alert.alert('Error', 'Google auth is not ready. Please wait a moment and try again.');
      return;
    }

    setGoogleLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Google OAuth prompt timed out after 30 seconds. Please check your Android Client ID configuration and SHA-1 fingerprint in Google Cloud Console.'));
        }, 30000);
      });
      
      const result = await Promise.race([
        promptAsync(),
        timeoutPromise
      ]) as any;
      
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setGoogleLoading(false);
        return;
      }
    } catch (error: any) {
      setGoogleLoading(false);
      let errorMessage = error.message || 'Failed to start Google authentication.';
      
      if (Platform.OS === 'android') {
        errorMessage += '\n\nFor Android OAuth:\n';
        errorMessage += '1. Verify the Android Client ID is correct in Google Cloud Console\n';
        errorMessage += '2. Ensure SHA-1 fingerprint is registered\n';
        errorMessage += '3. Check that package name matches: com.arclight.app\n';
        errorMessage += '4. Try rebuilding the app: npx expo prebuild && npx expo run:android';
      }
      
      Alert.alert('Google Auth Error', errorMessage);
    }
  };

  const handleGoogleAuthSuccess = async (idToken: string) => {
    try {
      const { response, data } = await apiService.googleAuth(idToken);

      if (response.ok && data.success === true) {
        console.log('✅ Google auth successful!');
        router.replace('/(app)/home');
      } else {
        const errorMessage = data.message || data.error?.message || 'Google authentication failed.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Google auth API error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to authenticate with Google. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
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
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              {/* Arclight SVG Logo */}
              <Svg width={80} height={80} viewBox="0 0 707.9 631.64">
                <G id="Layer_3">
                  <Path
                    d="M856.46,719.56,722.79,488,558.61,772.39a12.25,12.25,0,0,1-.78,1.36l0,.07h0a14.85,14.85,0,0,1-5,4.65l-79.9,46.13H795.82C849.73,824.6,883.42,766.24,856.46,719.56Z"
                    transform="translate(-158.05 -192.95)"
                    fill="#ffffff"
                  />
                  <Path
                    d="M427.8,706.3a14.71,14.71,0,0,1,1.54-6.63h0l0,0a13.16,13.16,0,0,1,.84-1.46l207-358.46L572.64,228c-26.95-46.69-94.33-46.69-121.28,0L167.54,719.56c-27,46.68,6.73,105,60.64,105H427.8Z"
                    transform="translate(-158.05 -192.95)"
                    fill="#ffffffff"
                  />
                </G>
              </Svg>
            </View>
            <Text style={styles.logoText}>arclight</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleAuth}
              activeOpacity={0.8}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#ffffff"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#ffffff"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#ffffff"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#ffffff"
                    />
                  </Svg>
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Name Input - Only show for signup */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#888"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, loading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {isSignUp ? 'SIGN UP' : 'CONTINUE'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Login/Signup */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={loading}>
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Log in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot Password - Only show on login */}
            {!isSignUp && (
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => {
                  // TODO: Navigate to forgot password screen
                  Alert.alert('Info', 'Forgot password feature coming soon');
                }}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
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
    paddingVertical: 40,
  },
  
  // ========== LOGO STYLES ==========
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 2,
    fontFamily: 'geistmono',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 0.5,
    fontFamily: 'geistmono',
  },
  
  // ========== FORM STYLES ==========
  formContainer: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    fontSize: 16,
    color: '#FFF',
    padding: 0,
    fontFamily: 'geistmono',
  },
  
  // ========== BUTTON STYLES ==========
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
    fontFamily: 'geistmono',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    fontFamily: 'geistmono',
  },
  continueButton: {
    backgroundColor: '#5B6BB5',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1.2,
    fontFamily: 'geistmono',
  },
  
  // ========== TOGGLE STYLES ==========
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'geistmono',
  },
  toggleLink: {
    fontSize: 14,
    color: '#5B6BB5',
    fontWeight: '600',
    fontFamily: 'geistmono',
  },
  
  // ========== FORGOT PASSWORD STYLES ==========
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#5B6BB5',
    fontWeight: '500',
    fontFamily: 'geistmono',
  },
});

