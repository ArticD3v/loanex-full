import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { authColors } from '../../theme/colors';

const logoSource = require('../../../assets/logo-loanex.png');

interface LogoHeaderProps {
  subtitle?: string;
  size?: 'splash' | 'compact' | 'medium' | 'login';
  /** Light subtitle on navy auth shell */
  onDark?: boolean;
}

export function LogoHeader({ subtitle, size = 'medium', onDark = false }: LogoHeaderProps) {
  const styles = useMemo(() => createStyles(size, onDark), [size, onDark]);

  return (
    <View style={styles.container}>
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(size: 'splash' | 'compact' | 'medium' | 'login', onDark: boolean) {
  // login: ~25% smaller than previous 230px width
  const logoWidth =
    size === 'splash' ? 300 : size === 'login' ? 172 : size === 'compact' ? 200 : 220;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: size === 'splash' ? spacing.xxxl : size === 'login' ? spacing.md : spacing.lg,
    },
    logo: {
      width: logoWidth,
      height: logoWidth * 0.68,
    },
    subtitle: {
      ...typography.bodySmall,
      color: onDark ? authColors.textOnDarkMuted : authColors.textSecondary,
      marginTop: size === 'login' ? spacing.md : spacing.lg,
      textAlign: 'center',
      fontWeight: '500',
      letterSpacing: 0.3,
    },
  });
}
