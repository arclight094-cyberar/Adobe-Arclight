import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Mail } from 'lucide-react-native';
import Svg, { G, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import apiService from '../../services/api';
import { API_BASE_URL } from '../../constants/api';
import { useTheme } from '../../context/ThemeContext';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function SignupScreen() {
  const { colors } = useTheme();
  const [isSignIn, setIsSignIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth Configuration
  // Get Client ID from environment variables (.env file)
  // Priority: Platform-specific > Web > Fallback
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

  console.log('Google OAuth - Platform:', Platform.OS);
  console.log('Google OAuth - Client ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 40)}...` : 'NOT SET - Check .env file!');
  console.log('Google OAuth - Redirect URI:', redirectUri || 'Not needed for Android (native auth)');

  // Configure Google Auth Request
  const googleAuthConfig: any = {
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  };

  // Only add redirectUri for non-Android platforms
  if (redirectUri && Platform.OS !== 'android') {
    googleAuthConfig.redirectUri = redirectUri;
    console.log('⚠️ IMPORTANT: Register this redirect URI in Google Cloud Console:', redirectUri);
  } else if (Platform.OS === 'android') {
    console.log('✅ Using Android Client ID - no redirect URI needed');
  }

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig);

  // Handle Google Auth Response
  useEffect(() => {
    console.log('=== Google OAuth Response Handler ===');
    console.log('Response object:', response ? 'EXISTS' : 'UNDEFINED');
    console.log('Response type:', response?.type || 'NO TYPE');
    
    if (!response) {
      console.log('⏳ Waiting for Google OAuth response...');
      return;
    }
    
    // Type guard for success response
    if (response.type === 'success') {
      const idToken = (response as any).params?.id_token;
      if (idToken) {
        console.log('✅ SUCCESS: Got ID token from Google');
        console.log('ID Token length:', idToken.length);
        console.log('ID Token preview:', idToken.substring(0, 50) + '...');
        handleGoogleAuthSuccess(idToken);
      } else {
        console.error('❌ SUCCESS response but no ID token!');
        console.error('Response:', JSON.stringify(response, null, 2));
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      console.error('❌ Google OAuth ERROR');
      console.error('Error object:', JSON.stringify(response.error, null, 2));
      console.error('Error code:', response.error?.code);
      console.error('Error message:', response.error?.message);
      
      // Check for specific error types
      let errorMessage = 'Google authentication failed. Please try again.';
      if (response.error?.message) {
        errorMessage = response.error.message;
      } else if (response.error?.code === 'ERR_REQUEST_CANCELED') {
        errorMessage = 'Authentication was cancelled.';
      }
      
      Alert.alert('Google Auth Error', errorMessage);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
      console.log('User cancelled Google auth');
    } else {
      console.log('⚠️ Unknown response type:', response?.type);
      console.log('Full response:', JSON.stringify(response, null, 2));
    }
    console.log('===================================');
  }, [response]);

  const handleGoogleAuth = async () => {
    console.log('=== handleGoogleAuth CALLED ===');
    console.log('GOOGLE_CLIENT_ID exists:', !!GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_ID length:', GOOGLE_CLIENT_ID?.length || 0);
    console.log('Request object exists:', !!request);
    console.log('Platform:', Platform.OS);
    console.log('Expo app ownership:', Constants.appOwnership || 'unknown');
    console.log('Is Expo Go:', Constants.appOwnership === 'expo');
    
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
      console.error('❌ Google Client ID is missing!');
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
      console.error('❌ Google auth request object is not ready!');
      Alert.alert('Error', 'Google auth is not ready. Please wait a moment and try again.');
      return;
    }

    setGoogleLoading(true);
    try {
      console.log('=== Starting Google OAuth ===');
      console.log('Request object:', request ? 'READY' : 'NOT READY');
      console.log('Client ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 40)}...` : 'MISSING');
      console.log('About to call promptAsync()...');
      
      // Add timeout to detect if promptAsync hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Google OAuth prompt timed out after 30 seconds. Please check your Android Client ID configuration and SHA-1 fingerprint in Google Cloud Console.'));
        }, 30000);
      });
      
      const result = await Promise.race([
        promptAsync(),
        timeoutPromise
      ]) as any;
      
      console.log('=== Google OAuth Prompt Result ===');
      console.log('Result type:', result.type);
      console.log('Result params:', result.params ? 'EXISTS' : 'NO PARAMS');
      console.log('Full result:', JSON.stringify(result, null, 2));
      
      // If user cancels, handle it
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setGoogleLoading(false);
        console.log('User cancelled during prompt');
        return;
      }
      
      // Response handling is done in useEffect above
      console.log('Prompt completed, waiting for response in useEffect...');
    } catch (error: any) {
      setGoogleLoading(false);
      console.error('=== Google OAuth Exception ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = error.message || 'Failed to start Google authentication.';
      
      // Provide specific guidance for Android
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
      console.log('=== Calling Backend Google Auth ===');
      console.log('ID Token length:', idToken?.length || 0);
      console.log('ID Token preview:', idToken ? `${idToken.substring(0, 50)}...` : 'MISSING');
      
      // Call backend Google auth endpoint
      const { response, data } = await apiService.googleAuth(idToken);

      console.log('Backend response status:', response.status);
      console.log('Backend response ok:', response.ok);
      console.log('Backend response data:', data);

      if (response.ok && data.success === true) {
        // Token and user data are already stored by apiService
        console.log('✅ Google auth successful!');
        // Navigate to workspace
        router.replace('/(app)/home');
      } else {
        // Handle error response from backend
        // Backend returns: { status: 'fail', message: '...' } for errors
        console.error('❌ Backend error response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Backend error format: { status: 'fail'/'error', message: '...' }
        const errorMessage = data?.message || 
                            data?.error?.message || 
                            `Backend error (${response.status}): ${response.statusText || 'Unknown error'}`;
        
        Alert.alert(
          'Authentication Error', 
          `${errorMessage}\n\nCheck backend console for detailed error logs.`
        );
      }
    } catch (error: any) {
      console.error('❌ Google auth API error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      Alert.alert(
        'Error',
        error.message || 'Failed to authenticate with Google. Please check backend logs for details.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAdobeAuth = () => {
    console.log('Adobe auth');
  };

  const handleEmailAuth = () => {
    router.push('/(auth)/login');
  };

  const handleToggleSignIn = () => {
    setIsSignIn(!isSignIn);
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.auth.background }]}>
      {/* Changed from ScrollView to View */}
      <View style={[styles.container, { backgroundColor: colors.auth.background }]}>
        <View style={styles.imageSection}>
          <Image
            source={require('../../assets/images/arclight_auth_image.jpg')}
            style={styles.backgroundImage}
          />
          <View style={styles.overlay} />
          <View style={styles.logoOverlay}>
            <Svg width={100} height={100} viewBox="0 0 707.9 631.64">
              <G id="Layer_3">
                <Path
                  d="M856.46,719.56,722.79,488,558.61,772.39a12.25,12.25,0,0,1-.78,1.36l0,.07h0a14.85,14.85,0,0,1-5,4.65l-79.9,46.13H795.82C849.73,824.6,883.42,766.24,856.46,719.56Z"
                  transform="translate(-158.05 -192.95)"
                  fill={colors.auth.svg}
                />
                <Path
                  d="M427.8,706.3a14.71,14.71,0,0,1,1.54-6.63h0l0,0a13.16,13.16,0,0,1,.84-1.46l207-358.46L572.64,228c-26.95-46.69-94.33-46.69-121.28,0L167.54,719.56c-27,46.68,6.73,105,60.64,105H427.8Z"
                  transform="translate(-158.05 -192.95)"
                  fill={colors.auth.svg}
                />
              </G>
            </Svg>
            <Text style={[styles.logoText, { fontFamily: "geistmono", color: colors.auth.text }]}>
              arclight
            </Text>
          </View>
        </View>

        {/* BOTTOM SECTION */}

        <View style={styles.contentSection}>
          {/* This wrapper ensures the header/buttons stay at the top */}
          <View style={styles.topContentWrapper}>
            <View style={styles.headerContainer}>
              <Text style={[styles.title, {fontFamily: "geistmono", color: colors.auth.text}]}>
                WELCOME TO ARCLIGHT.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.authButton, styles.outlineButton, { backgroundColor: colors.auth.input, borderColor: colors.auth.inputBorder }, googleLoading && styles.authButtonDisabled]}
                onPress={handleGoogleAuth}
                activeOpacity={0.8}
                disabled={googleLoading || !request}
              >
                {googleLoading ? (
                  <ActivityIndicator color={colors.auth.textDark} size="small" />
                ) : (
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill={colors.auth.textDark}
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill={colors.auth.textDark}
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill={colors.auth.textDark}
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill={colors.auth.textDark}
                    />
                  </Svg>
                )}
                <Text style={[styles.buttonText, { color: colors.auth.textDark }]}>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, styles.outlineButton, { backgroundColor: colors.auth.input, borderColor: colors.auth.inputBorder }]}
                onPress={handleAdobeAuth}
                activeOpacity={0.8}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624Z" fill={colors.auth.textDark} />
                </Svg>
                <Text style={[styles.buttonText, { color: colors.auth.textDark }]}>Continue with Adobe</Text>
              </TouchableOpacity>

              {/* ===== OR DIVIDER ===== */}  
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: colors.auth.divider }]} />
                <Text style={[styles.dividerText, { color: colors.auth.text }]}>OR</Text>
                <View style={[styles.divider, { backgroundColor: colors.auth.divider }]} />
              </View>

              <TouchableOpacity
                style={[styles.authButton, styles.emailButton, { backgroundColor: colors.auth.button }]}
                onPress={handleEmailAuth}
                activeOpacity={0.8}
              >
                <Mail size={20} color={colors.auth.text} />
                <Text style={[styles.buttonText, styles.emailButtonText, { color: colors.auth.text }]}>Continue with Email</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signInToggleContainer}>
              <Text style={[styles.toggleBaseText, { color: colors.auth.textGray }]}>
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={handleToggleSignIn} activeOpacity={0.7}>
                <Text style={[styles.toggleLinkText, { color: colors.auth.text }]}>
                  {isSignIn ? 'Sign Up' : 'Log in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* This footer will be pushed to the bottom */}
          <View style={[styles.footer, { borderTopColor: colors.auth.divider }]}>
            <Text style={[styles.footerText, { color: colors.auth.textLight }]}>
              By continuing, you agree to our{' '}
              <Text style={[styles.footerLink, { color: colors.auth.text }]}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={[styles.footerLink, { color: colors.auth.text }]}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1, // This makes the View fill the SafeAreaView
  },
  imageSection: {
    width: '100%',
    height: height * 0.375, // Fixed height for the top image
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 4,
    marginTop: 12,
  },
  
  // ===== STYLES UPDATED FOR SIZING & DEBUGGING =====

  contentSection: {
    flex: 1, // This is the key: makes it fill the *remaining* space
    justifyContent: 'space-between', // Pushes footer to the bottom
    paddingHorizontal: 28,
    paddingTop: 20, // Reduced from 30
    paddingBottom: 10, 
    // DEBUG BORDER (red)
    // borderWidth: 1,
    // borderColor: 'red',
  },
  topContentWrapper: {
    // DEBUG BORDER (black)
    // borderWidth: 1,
    // borderColor: 'black',
  },
  headerContainer: {
    marginBottom: 24, // Reduced from 32
    paddingHorizontal: 16,
    // DEBUG BORDER (black)
    // borderWidth: 1,
    // borderColor: 'black',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    fontFamily: 'geistmono',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: 'geistmono',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 10, // Reduced from 28
    // DEBUG BORDER (black)
    // borderWidth: 1,
    // borderColor: 'black',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 12,
  },
  outlineButton: {
    borderWidth: 1,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  emailButton: {
  },
  emailButtonText: {
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'geistmono',
  },

  // ===== OR DIVIDER STYLES =====
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 0,
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'geistmono',
  },

  // ===== TOGGLE STYLES (FROM PREVIOUS STEP) =====
  signInToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24, // Reduced from 24
    padding:2,
    // DEBUG BORDER (black)
    // borderWidth: 1,
    // borderColor: 'black',
  },
  toggleBaseText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'geistmono',
  },
  toggleLinkText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
    fontFamily: 'geistmono',
  },

  // ===== FOOTER STYLES =====
  footer: {
    paddingTop: 8,
    borderTopWidth: 0,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: 'geistmono',
  },
  footerLink: {
    fontWeight: '500',
    fontFamily: 'geistmono',
  },
});

