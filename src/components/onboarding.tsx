import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Alert, 
  useColorScheme, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { fs, SCREEN_WIDTH } from '../constants/layout';
import { GoogleUser, LeaveRecord, UserSettings } from '../types';
import { useLeaveStore } from '../storage/store';
import { backupService } from '../services/backup';

interface OnboardingProps {
  onComplete: (userData: { userName: string; email: string; googleUser: GoogleUser | null; backupEnabled: boolean }, restoreData?: { leaves: LeaveRecord[]; settings: UserSettings }) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const [step, setStep] = useState<1 | 2>(1);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  
  // Async states
  const [loading, setLoading] = useState(false);
  const [backupCheckResult, setBackupCheckResult] = useState<{ leaves: LeaveRecord[]; settings: UserSettings } | null>(null);
  const [showBackupAlert, setShowBackupAlert] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleNextStep = () => {
    if (!userName.trim()) {
      useLeaveStore.getState().showToast('Required', 'Please enter your name to proceed.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    setStatusMessage('Connecting to Google Drive...');
    try {
      const user = await backupService.signInWithGoogle();
      setGoogleUser(user);
      setStatusMessage('Checking for backups...');
      
      try {
        const backup = await backupService.restoreFromGoogleDrive(user);
        setBackupCheckResult(backup);
        setLoading(false);
        setShowBackupAlert(true);
      } catch (err) {
        // No backup found, just complete onboarding
        setLoading(false);
        setStatusMessage('No backup found. Starting fresh!');
        setTimeout(() => {
          onComplete({
            userName: userName.trim(),
            email: email.trim() || user.email,
            googleUser: user,
            backupEnabled: true
          });
        }, 1200);
      }
    } catch (err) {
      setLoading(false);
      setStatusMessage('');
      useLeaveStore.getState().showToast('Connection Failed', 'Could not authenticate with Google.', 'error');
    }
  };

  const handleRestoreBackup = () => {
    if (backupCheckResult) {
      onComplete({
        userName: backupCheckResult.settings.userName,
        email: backupCheckResult.settings.email,
        googleUser,
        backupEnabled: true
      }, backupCheckResult);
    }
  };

  const handleStartFresh = () => {
    onComplete({
      userName: userName.trim(),
      email: email.trim(),
      googleUser,
      backupEnabled: true
    });
  };

  const handleSkipGoogle = () => {
    onComplete({
      userName: userName.trim(),
      email: email.trim(),
      googleUser: null,
      backupEnabled: false
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Progress Indicators */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressIndicator, { backgroundColor: colors.primary }]} />
            <View style={[styles.progressIndicator, { backgroundColor: step === 2 ? colors.primary : colors.divider }]} />
          </View>

          {step === 1 ? (
            <View style={styles.stepWrapper}>
              <View style={styles.iconHeaderContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight + '30' }]}>
                  <Ionicons name="sparkles" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Welcome to My Leave</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Keep track of your annual allocations, log leaves offline, and export HR-ready compliance reports.
                </Text>
              </View>

              <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Set Up Your Profile</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                  <TextInput
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                    value={userName}
                    onChangeText={setUserName}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address (Optional)</Text>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>

                <Pressable
                  style={[
                    styles.primaryButton, 
                    { backgroundColor: colors.primary },
                    !userName.trim() && { opacity: 0.6 }
                  ]}
                  onPress={handleNextStep}
                  disabled={!userName.trim()}
                >
                  <Text style={styles.buttonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.stepWrapper}>
              <View style={styles.iconHeaderContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: '#10b98120' }]}>
                  <Ionicons name="cloud-done-outline" size={32} color="#10b981" />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Cloud Storage Backup</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Securely link your Google account to back up data offline and restore existing logs from other devices.
                </Text>
              </View>

              <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>{statusMessage}</Text>
                  </View>
                ) : showBackupAlert ? (
                  <View style={styles.backupContainer}>
                    <Ionicons name="cloud-download-outline" size={44} color={colors.primary} style={{ marginBottom: Spacing.md }} />
                    <Text style={[styles.backupTitle, { color: colors.text }]}>Existing Backup Found</Text>
                    <Text style={[styles.backupText, { color: colors.textSecondary }]}>
                      We discovered a prior leave history logged under this account. Would you like to restore it now?
                    </Text>

                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%', marginBottom: Spacing.sm }]}
                      onPress={handleRestoreBackup}
                    >
                      <Ionicons name="refresh-circle" size={18} color="#ffffff" />
                      <Text style={styles.buttonText}>Restore My Data</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.outlineButton, { borderColor: colors.border, width: '100%' }]}
                      onPress={handleStartFresh}
                    >
                      <Text style={[styles.outlineButtonText, { color: colors.textSecondary }]}>Start Fresh</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.backupContainer}>
                    {googleUser ? (
                      <View style={styles.accountCard}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <Text style={[styles.accountEmail, { color: colors.text }]}>{googleUser.email}</Text>
                        <Text style={[styles.accountStatus, { color: colors.textMuted }]}>{statusMessage || 'Connected successfully'}</Text>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={[styles.googleButton, { borderColor: colors.border }]}
                          onPress={handleConnectGoogle}
                        >
                          <Ionicons name="logo-google" size={20} color={colors.primary} />
                          <Text style={[styles.googleButtonText, { color: colors.text }]}>Link Google Drive</Text>
                        </Pressable>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                          Uses isolated AppData sandboxed space.
                        </Text>
                      </>
                    )}

                    <View style={styles.buttonSpacer} />

                    <View style={styles.footerButtons}>
                      <Pressable
                        style={[styles.skipButton]}
                        onPress={handleSkipGoogle}
                      >
                        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip & Start Fresh</Text>
                      </Pressable>

                      {googleUser && (
                        <Pressable
                          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                          onPress={handleStartFresh}
                        >
                          <Text style={styles.buttonText}>Finish</Text>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  progressIndicator: {
    height: 6,
    width: 32,
    borderRadius: BorderRadius.round,
  },
  stepWrapper: {
    gap: Spacing.xxl,
  },
  iconHeaderContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fs(24),
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(13),
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: fs(11),
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: fs(14),
  },
  primaryButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: fs(14),
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: fs(13),
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  backupContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  backupTitle: {
    fontSize: fs(18),
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  backupText: {
    fontSize: fs(12),
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  outlineButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginVertical: Spacing.md,
  },
  googleButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  infoLabel: {
    fontSize: fs(11),
    textAlign: 'center',
  },
  accountCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    width: '100%',
  },
  accountEmail: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  accountStatus: {
    fontSize: fs(12),
  },
  buttonSpacer: {
    height: Spacing.xl,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.md,
  },
  skipButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
});
