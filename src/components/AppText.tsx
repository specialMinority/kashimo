import React from 'react';
import { Text as NativeText, TextProps } from 'react-native';
import { typography } from '../styles/theme';

export const AppText = React.forwardRef<React.ElementRef<typeof NativeText>, TextProps>(
    ({ style, ...props }, ref) => <NativeText ref={ref} {...props} style={[{ fontFamily: typography.fontFamily.regular }, style]} />,
);
AppText.displayName = 'AppText';
