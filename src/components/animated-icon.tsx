import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import Animated, { 
  Easing, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { useLeaveStore } from '../storage/store';
import { fs } from '../constants/layout';

export function AnimatedSplashOverlay() {
  const storeLoading = useLeaveStore((state) => state.isLoading);
  const [visible, setVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  
  // Screen exit animations
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);
  
  // Element entrance animations
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(24);
  const spinnerOpacity = useSharedValue(0);

  useEffect(() => {
    // Prevent default auto-hide
    SplashScreen.preventAutoHideAsync().catch(() => {});
    
    // Entrance animations
    logoScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    
    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) })
    );
    textTranslateY.value = withDelay(
      400,
      withSpring(0, { damping: 15, stiffness: 80 })
    );
    
    spinnerOpacity.value = withDelay(
      800,
      withTiming(1, { duration: 400 })
    );

    // Enforce a minimum display duration of 1.8 seconds to play animations
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Trigger smooth animated exit only when initial database load completes AND minimum display time has elapsed
    if (!storeLoading && minTimeElapsed) {
      SplashScreen.hideAsync()
        .then(() => {
          // Animate scale up and opacity down
          overlayOpacity.value = withTiming(0, { duration: 700, easing: Easing.bezier(0.25, 1, 0.5, 1) });
          overlayScale.value = withTiming(1.15, { duration: 700, easing: Easing.bezier(0.25, 1, 0.5, 1) }, (finished) => {
            if (finished) {
              runOnJS(setVisible)(false);
            }
          });
        })
        .catch(() => {
          setVisible(false);
        });
    }
  }, [storeLoading, minTimeElapsed]);

  // Animated style properties
  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
      transform: [{ scale: overlayScale.value }],
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

  const spinnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: spinnerOpacity.value,
    };
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splashOverlay, overlayAnimatedStyle]}>
      {/* Branded glow effect background */}
      <Image
        source={require('@/assets/images/logo-glow.png')}
        style={styles.backgroundImageGlow}
        contentFit="cover"
      />

      <View style={styles.contentContainer}>
        {/* App Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            style={styles.image}
            source={require('@/assets/images/app-logo.png')}
            contentFit="contain"
          />
        </Animated.View>

        {/* App Title & Subtitle */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.title}>My Leaves</Text>
          <Text style={styles.subtitle}>Personal Leave Tracker</Text>
        </Animated.View>

        {/* Loading Spinner */}
        <Animated.View style={spinnerAnimatedStyle}>
          <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#090d16', // Sleek dark branded background
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  backgroundImageGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    backgroundColor: '#131c2e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  image: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fs(28),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fs(14),
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 40,
  },
  spinner: {
    transform: [{ scale: 1.2 }],
  },
});
