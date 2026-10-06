import { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Screen, PrimaryButton, SecondaryButton, SPACING, RADIUS } from '../components/DesignSystem';
import { useTheme } from '../theme/ThemeProvider';

export default function AuthScreen() {
  const { theme, themeType } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = (session: any) => {
      const metadata = session?.user?.user_metadata || {};
      if (!metadata.onboarding_complete) {
        router.replace('/onboarding' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkOnboarding(session);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkOnboarding(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail() {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Error', error.message);
      setAuthLoading(false);
    }
  }

  async function signUpWithEmail() {
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Check your email for the login link!');
    }
    setAuthLoading(false);
  }

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <Screen style={{ justifyContent: 'center', paddingHorizontal: SPACING.xl }}>
      <Text style={{ fontSize: 40, fontWeight: '800', color: theme.primaryText, textAlign: 'center', marginBottom: SPACING.xs }}>ANDE MED</Text>
      <Text style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center', marginBottom: SPACING.xxl }}>Adaptive Intelligence for Medical Exams</Text>
      
      <View style={{ gap: SPACING.md }}>
        <TextInput
          style={{
            backgroundColor: theme.surface,
            color: theme.primaryText,
            paddingHorizontal: SPACING.md,
            paddingVertical: 14,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: theme.border,
            fontSize: 16
          }}
          onChangeText={setEmail}
          value={email}
          placeholder="email@example.com"
          placeholderTextColor={theme.tertiaryText}
          autoCapitalize="none"
        />
        <TextInput
          style={{
            backgroundColor: theme.surface,
            color: theme.primaryText,
            paddingHorizontal: SPACING.md,
            paddingVertical: 14,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: theme.border,
            fontSize: 16
          }}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={theme.tertiaryText}
          autoCapitalize="none"
        />
        
        <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
          <PrimaryButton title="Sign In" onPress={signInWithEmail} disabled={authLoading} />
          <SecondaryButton title="Create Account" onPress={signUpWithEmail} disabled={authLoading} />
        </View>
      </View>
    </Screen>
  );
}
