import { Image, type StyleProp, type ImageStyle } from 'react-native';

const LOGO = require('../../assets/brand/logo.png');
const LOGO_SMALL = require('../../assets/brand/logo-small.png');
/** Width / height of the trimmed logo artwork. */
export const LOGO_RATIO = 1.0276;

/** The Underdog logo (the only logo used anywhere in the app). `width` in points. */
export function Logo({ width, style }: { width: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={width <= 140 ? LOGO_SMALL : LOGO}
      style={[{ width, height: width / LOGO_RATIO }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Underdog"
    />
  );
}
