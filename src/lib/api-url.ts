import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiOrigin(): string {
  // 1. If an explicit URL is provided (Production or Custom Dev Server), use it.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. In development using Expo Go or Dev Client on physical devices, 
  // Constants.expoConfig?.hostUri will contain the LAN IP of the bundler (e.g. 192.168.1.5:8081).
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }

  // 3. Fallback for iOS simulator or Android emulator (if localhost is somehow mapped, though Android needs 10.0.2.2 usually)
  // But wait, Android emulator uses 10.0.2.2, iOS simulator uses localhost.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8081';
  }

  return 'http://localhost:8081';
}
