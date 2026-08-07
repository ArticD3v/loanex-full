import React, { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { LogoHeader } from '../components/LogoHeader';
import { authColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const styles = useMemo(() => createStyles(), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LogoHeader subtitle="Enterprise Lending Platform" size="splash" onDark />
      <ActivityIndicator size="large" color={authColors.accent} style={styles.loader} />
      <Text style={styles.loadingText}>Loading secure console…</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: authColors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    loader: {
      marginTop: spacing.xxl,
    },
    loadingText: {
      ...typography.bodySmall,
      color: authColors.textOnDarkMuted,
      marginTop: spacing.lg,
      letterSpacing: 0.4,
    },
  });
}
