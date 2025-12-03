// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// TYPES
// ============================================================
type ThemeMode = 'light' | 'dark' | 'system';

type Theme = {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Border colors
  border: string;
  borderSecondary: string;
  
  // Button colors
  primary: string;
  primaryText: string;
  
  // Card colors
  card: string;
  cardBorder: string;
  
  // Input colors
  input: string;
  inputBorder: string;
  inputPlaceholder: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Modal colors
  modalBackground: string;
  overlay: string;
};

type ThemeContextType = {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

// ============================================================
// THEME DEFINITIONS
// ============================================================
const lightTheme: Theme = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#EEECE5',
  
  // Text
  text: '#1D1B20',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Borders
  border: '#E0E0E0',
  borderSecondary: '#D0CDB8',
  
  // Buttons
  primary: '#222222',
  primaryText: '#FFFFFF',
  
  // Cards
  card: '#FFFFFF',
  cardBorder: '#E0E0E0',
  
  // Inputs
  input: '#F5F5F5',
  inputBorder: '#E0E0E0',
  inputPlaceholder: '#999999',
  
  // Status
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Modal
  modalBackground: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme: Theme = {
  // Backgrounds
  background: '#000000',
  backgroundSecondary: '#141414',
  backgroundTertiary: '#1C1C1C',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  
  // Borders
  border: '#2C2C2C',
  borderSecondary: '#3A3A3A',
  
  // Buttons
  primary: '#FFFFFF',
  primaryText: '#000000',
  
  // Cards
  card: '#1C1C1C',
  cardBorder: '#2C2C2C',
  
  // Inputs
  input: '#1C1C1C',
  inputBorder: '#2C2C2C',
  inputPlaceholder: '#666666',
  
  // Status
  success: '#66BB6A',
  error: '#EF5350',
  warning: '#FFA726',
  info: '#42A5F5',
  
  // Modal
  modalBackground: '#1C1C1C',
  overlay: 'rgba(0, 0, 0, 0.8)',
};

// ============================================================
// CREATE CONTEXT
// ============================================================
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================
// THEME PROVIDER COMPONENT
// ============================================================
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const deviceColorScheme = useColorScheme(); // Get device theme ('light' | 'dark')
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // DETERMINE CURRENT THEME
  // If mode is 'system', use device theme, otherwise use selected mode
  // ============================================================
  const isDark = themeMode === 'system' 
    ? deviceColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  // ============================================================
  // LOAD SAVED THEME PREFERENCE ON APP START
  // ============================================================
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // SET THEME MODE AND SAVE TO ASYNC STORAGE
  // ============================================================
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('theme_preference', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // ============================================================
  // TOGGLE BETWEEN LIGHT AND DARK (IGNORES SYSTEM)
  // ============================================================
  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        themeMode, 
        isDark, 
        setThemeMode, 
        toggleTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================
// CUSTOM HOOK TO USE THEME
// ============================================================
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// ============================================================
// EXPORT THEME TYPE FOR TYPESCRIPT
// ============================================================
export type { Theme, ThemeMode };