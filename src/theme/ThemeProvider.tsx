import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, useColorScheme } from 'react-native';

export type ThemeType = 'dark' | 'light' | 'colorful';

export const THEMES = {
  dark: {
    id: 'dark',
    background: '#000000',
    surface: '#121214',
    surfaceElevated: '#1C1C1E',
    surfaceHighlight: '#2C2C2E',
    primaryText: '#FFFFFF',
    secondaryText: '#8E8E93',
    tertiaryText: '#636366',
    border: '#2C2C2E',
    accent: '#0A84FF',
    success: '#30D158',
    warning: '#FF9F0A',
    critical: '#FF453A',
    revision: '#BF5AF2',
    learning: '#64D2FF',
    integrated: '#5E5CE6',
    achievement: '#FF375F',
    energy: '#FFD60A',
    information: '#0A84FF',
    overlay: 'rgba(0,0,0,0.5)',
  },
  light: {
    id: 'light',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#F2F2F7',
    surfaceHighlight: '#E5E5EA',
    primaryText: '#000000',
    secondaryText: '#8E8E93',
    tertiaryText: '#AEAEB2',
    border: '#D1D1D6',
    accent: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    critical: '#FF3B30',
    revision: '#AF52DE',
    learning: '#5AC8FA',
    integrated: '#5856D6',
    achievement: '#FF2D55',
    energy: '#FFCC00',
    information: '#007AFF',
    overlay: 'rgba(0,0,0,0.2)',
  },
  colorful: {
    id: 'colorful',
    background: '#F2F2F7', // iOS health-like light background
    surface: '#FFFFFF',
    surfaceElevated: '#F9F9FB',
    surfaceHighlight: '#E5E5EA',
    primaryText: '#000000',
    secondaryText: '#8E8E93',
    tertiaryText: '#AEAEB2',
    border: '#D1D1D6',
    accent: '#007AFF', // General Accent
    success: '#34C759', // Mastered
    warning: '#FF9500', // Needs attention
    critical: '#FF3B30', // Urgent weakness (Coral/Red)
    revision: '#AF52DE', // Revision queue (Purple/Violet)
    learning: '#32ADE6', // Active studying (Cyan/Blue)
    integrated: '#00C7BE', // Integrated (Teal/Turquoise)
    achievement: '#FF2D55', // Achievement (Pink/Magenta)
    energy: '#FFCC00', // Energy (Yellow/Gold)
    information: '#5856D6', // Information (Indigo)
    overlay: 'rgba(0,0,0,0.2)',
  }
};

type ThemeContextType = {
  theme: typeof THEMES.dark;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.dark,
  themeType: 'dark',
  setThemeType: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeType, setThemeTypeState] = useState<ThemeType>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@theme').then(saved => {
      if (saved && (saved === 'dark' || saved === 'light' || saved === 'colorful')) {
        setThemeTypeState(saved as ThemeType);
      }
      setIsReady(true);
    });
  }, []);

  const setThemeType = async (type: ThemeType) => {
    setThemeTypeState(type);
    await AsyncStorage.setItem('@theme', type);
  };

  if (!isReady) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <ThemeContext.Provider value={{ themeType, theme: THEMES[themeType], setThemeType }}>
      {children}
    </ThemeContext.Provider>
  );
};
