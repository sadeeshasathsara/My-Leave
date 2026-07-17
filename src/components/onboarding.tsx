import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Pressable, 
  ActivityIndicator, 
  useColorScheme, 
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { fs } from '../constants/layout';
import { GoogleUser, LeaveRecord, UserSettings } from '../types';
import { backupService } from '../services/backup';
import { useLeaveStore } from '../storage/store';

interface OnboardingProps {
  onComplete: (
    userData: { userName: string; email: string; googleUser: GoogleUser | null; backupEnabled: boolean }, 
    restoreData?: { leaves: LeaveRecord[]; settings: UserSettings }
  ) => void;
}

type SetupPhase = 
  | 'idle'
  | 'authenticating'
  | 'connecting'
  | 'scanning'
  | 'restoring_data'
  | 'fresh_profile'
  | 'finalizing'
  | 'done';

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<'welcome' | 'processing'>('welcome');
  const [phase, setPhase] = useState<SetupPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for cloud icon
  useEffect(() => {
    if (step === 'processing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [step]);

  // Rotation animation for spinner
  useEffect(() => {
    if (step === 'processing') {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      rotate.start();
      return () => rotate.stop();
    }
  }, [step]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSignIn = async () => {
    setErrorMessage(null);
    setStep('processing');
    
    // Phase 1: Authenticate
    setPhase('authenticating');
    let user: GoogleUser;
    try {
      user = await backupService.signInWithGoogle();
    } catch (err) {
      console.error('[Onboarding] Sign-in failure:', err);
      setStep('welcome');
      setPhase('idle');
      useLeaveStore.getState().showToast('Authentication Failed', 'Google authentication could not be completed.', 'error');
      return;
    }

    // Phase 2: Connecting to Drive
    await new Promise((resolve) => setTimeout(resolve, 800));
    setPhase('connecting');

    // Phase 3: Scanning cloud storage
    await new Promise((resolve) => setTimeout(resolve, 800));
    setPhase('scanning');

    try {
      const backup = await backupService.restoreFromGoogleDrive(user);
      
      // Phase 4: Restoring data (backup found!)
      setPhase('restoring_data');
      
      // Progress animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }).start();

      await new Promise((resolve) => setTimeout(resolve, 1800));

      // Phase 5: Finalizing
      setPhase('finalizing');
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Done
      setPhase('done');
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Complete restoration
      onComplete({
        userName: backup.settings.userName,
        email: backup.settings.email,
        googleUser: user,
        backupEnabled: true,
      }, backup);

    } catch (err) {
      // Backup not found or restore failed
      console.log('[Onboarding] No prior backup found. Creating fresh profile.', err);

      // Phase 4: Fresh Profile (no backup found)
      setPhase('fresh_profile');
      
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }).start();

      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Phase 5: Finalizing
      setPhase('finalizing');
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Done
      setPhase('done');
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Complete fresh setup
      onComplete({
        userName: user.name,
        email: user.email,
        googleUser: user,
        backupEnabled: true,
      });
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'authenticating':
        return 'Authenticating with Google...';
      case 'connecting':
        return 'Connecting to Google Drive...';
      case 'scanning':
        return 'Scanning cloud app data space...';
      case 'restoring_data':
        return 'Prior backup found! Restoring leave logs...';
      case 'fresh_profile':
        return 'No backup found. Creating new workspace...';
      case 'finalizing':
        return 'Syncing database configurations...';
      case 'done':
        return 'All set! Launching My Leaves...';
      default:
        return 'Initializing...';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'welcome' ? (
        <View style={styles.welcomeWrapper}>
          {/* Top Logo and Title Section */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoShadowWrapper, colors.cardShadow]}>
              <Image 
                source={require('../../assets/images/app-logo.png')} 
                style={styles.logoImage}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>My Leaves</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Securely track your annual leave allocations, manage entries offline, and maintain automatic cloud backups in Google Drive.
            </Text>
          </View>

          {/* Premium Features List */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>100% Offline-First</Text>
                <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                  Your data stays on your device. Fast, private, and works completely without internet.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#0f9d5815' }]}>
                <Ionicons name="sync-outline" size={20} color="#0f9d58" />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Google Drive Sync</Text>
                <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                  Automatic isolated cloud backups in Google AppData folder. Restores instantly.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#f4b40015' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#f4b400" />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Private & Secure</Text>
                <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                  We do not run servers or store passwords. Your cloud backups belong solely to you.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button Section */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.googleBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9 }
              ]}
              onPress={handleSignIn}
            >
              <Ionicons name="logo-google" size={20} color="#ffffff" />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </Pressable>
            
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              By continuing, you authorize My Leaves to access isolated sandboxed application data on your Google Drive.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.processingWrapper}>
          {/* Animated Sync Visuals */}
          <View style={styles.animationContainer}>
            <Animated.View style={[styles.outerRing, { borderColor: colors.primary + '20', transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={[styles.innerRing, { backgroundColor: colors.primary + '08' }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="cloud-upload-outline" size={60} color={colors.primary} />
                </Animated.View>
              </Animated.View>
            </Animated.View>
            
            {/* Spinning Indicator */}
            <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="sync" size={24} color={colors.primary} />
            </Animated.View>
          </View>

          {/* Status Updates */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>Syncing Workspace</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>{getPhaseText()}</Text>
            
            {/* Progress bar */}
            {(phase === 'restoring_data' || phase === 'fresh_profile' || phase === 'finalizing' || phase === 'done') && (
              <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]} 
                />
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeWrapper: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  logoShadowWrapper: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: fs(28),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fs(13),
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  featuresContainer: {
    width: '100%',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    marginVertical: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrapper: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  featureDescription: {
    fontSize: fs(12),
    lineHeight: 16,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  googleBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: Spacing.md,
    elevation: 2,
  },
  googleBtnText: {
    color: '#ffffff',
    fontSize: fs(15),
    fontWeight: '700',
  },
  termsText: {
    fontSize: fs(11),
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  processingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: '#ffffff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: '100%',
  },
  statusTitle: {
    fontSize: fs(18),
    fontWeight: '800',
  },
  statusSubtitle: {
    fontSize: fs(13),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 6,
    width: '80%',
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
});

