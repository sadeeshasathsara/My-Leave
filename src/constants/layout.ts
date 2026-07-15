import { Dimensions, PixelRatio } from 'react-native';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// Standard design baseline sizes (usually based on a standard 375pt width smartphone like iPhone X/11 Pro/12 mini)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const SCREEN_WIDTH = windowWidth;
export const SCREEN_HEIGHT = windowHeight;

// Horizontal scaling factor
export const scale = (size: number) => {
  const scaledSize = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return PixelRatio.roundToNearestPixel(scaledSize);
};

// Vertical scaling factor
export const verticalScale = (size: number) => {
  const scaledSize = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  return PixelRatio.roundToNearestPixel(scaledSize);
};

// Moderate scaling (keeps fonts/padding from getting too large or too small)
// This is perfect for fonts and container paddings so they are responsive but not distorted.
export const moderateScale = (size: number, factor = 0.5) => {
  return PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);
};

// Font size responsive scaling
export const fs = (size: number, factor = 0.4) => {
  return moderateScale(size, factor);
};

// Layout responsive size helper
export const isTablet = SCREEN_WIDTH > 768;
export const isSmallDevice = SCREEN_WIDTH < 360;
