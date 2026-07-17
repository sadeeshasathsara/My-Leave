import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fs } from '../constants/layout';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { backupService } from '../services/backup';
import { useLeaveStore } from '../storage/store';

export default function SettingsScreen() {
  const systemScheme = useColorScheme();

  // Zustand Store
  const leaves = useLeaveStore((state) => state.leaves);
  const settings = useLeaveStore((state) => state.settings);
  const updateSettings = useLeaveStore((state) => state.updateSettings);
  const restoreFromBackup = useLeaveStore((state) => state.restoreFromBackup);
  const logoutAndClearData = useLeaveStore((state) => state.logoutAndClearData);
  const themeSetting = useLeaveStore((state) => state.settings.theme);
  const showToast = useLeaveStore((state) => state.showToast);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  // User input states
  const [name, setName] = useState(settings.userName);
  const [email, setEmail] = useState(settings.email);

  // Google Login and Backup States
  const googleUser = settings.googleUser;
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Sync inputs to Zustand store
  const handleSaveProfile = () => {
    if (!name.trim()) {
      showToast('Validation Error', 'Username cannot be blank.', 'warning');
      return;
    }

    updateSettings({
      userName: name.trim(),
      email: email.trim(),
    });

    showToast('Success', 'Profile settings updated successfully.', 'success');
  };

  // Theme change helper
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: newTheme });
  };

  // Google Sign-In trigger
  const handleGoogleLogin = async () => {
    if (googleUser) {
      // Log out
      updateSettings({ googleUser: null, backupEnabled: false });
      return;
    }

    setIsLoggingIn(true);
    try {
      const user = await backupService.signInWithGoogle();
      updateSettings({ googleUser: user, backupEnabled: true });
      showToast('Connected', `Successfully authenticated Google Account: ${user.email}`, 'success');
    } catch (err) {
      showToast('Authentication Failed', 'Unable to authenticate with Google.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Backup trigger
  const handleCloudBackup = async () => {
    if (!googleUser) {
      showToast('Sign-In Required', 'Please connect your Google Account before backing up.', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const timestamp = await backupService.backupToGoogleDrive(leaves, settings, googleUser);
      updateSettings({ lastBackup: timestamp });
      showToast('Backup Complete', 'Your leave records have been backed up successfully to Google Drive.', 'success');
    } catch (err) {
      showToast('Backup Failed', 'An error occurred during Google Drive cloud synchronization.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Restore trigger
  const handleCloudRestore = async () => {
    if (!googleUser) {
      showToast('Sign-In Required', 'Please connect your Google Account before restoring.', 'warning');
      return;
    }

    Alert.alert(
      'Confirm Restore',
      'Restoring will overwrite all current local leave logs and database configurations with the cloud file. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const payload = await backupService.restoreFromGoogleDrive(googleUser);
              restoreFromBackup(payload.leaves, payload.settings);

              // Sync text inputs
              setName(payload.settings.userName);
              setEmail(payload.settings.email);

              showToast('Restore Successful', 'Your database and settings have been loaded from Google Drive.', 'success');
            } catch (err: any) {
              showToast('Restore Failed', err.message || 'An error occurred while recovering files.', 'error');
            } finally {
              setIsRestoring(false);
            }
          }
        }
      ]
    );
  };

  // Local backup triggers
  const handleLocalBackup = async () => {
    try {
      await backupService.exportLocalBackup(leaves, settings);
    } catch (err) {
      showToast('Export Failed', 'Unable to create local JSON backup.', 'error');
    }
  };

  const handleLocalRestore = async () => {
    Alert.alert(
      'Import Backup File',
      'This will replace all local logs with the backup file data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              const payload = await backupService.importLocalBackup();
              restoreFromBackup(payload.leaves, payload.settings);

              // Sync inputs
              setName(payload.settings.userName);
              setEmail(payload.settings.email);

              showToast('Import Successful', 'Database restored from file.', 'success');
            } catch (err: any) {
              showToast('Import Failed', err.message || 'Could not parse JSON backup file.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out & Reset',
      'This will disconnect your account, delete all local leave logs, and reset all app states. This action is permanent. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out & Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutAndClearData();
              showToast('Reset Complete', 'You have successfully signed out and cleared all local data.', 'success');
            } catch (err) {
              showToast('Error', 'An error occurred during sign out.', 'error');
            }
          }
        }
      ]
    );
  };

  const handleDevWebsite = async () => {
    try {
      await Linking.openURL('https://sadeeshasathsara.me');
    } catch (err) {
      showToast('Error', 'Unable to open developer website.', 'error');
    }
  };

  const handleDevEmail = async () => {
    try {
      await Linking.openURL('mailto:sathsarakumbukage@gmail.com');
    } catch (err) {
      showToast('Error', 'Unable to open mail client.', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Profile Details Card */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Profile & Info</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              placeholder="user@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveProfile}
          >
            <Text style={styles.saveBtnText}>Save Profile Settings</Text>
          </Pressable>
        </View>

        {/* Color/Theme Configuration Card */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Select application stylesheet theme colors
          </Text>

          <View style={styles.themeGroup}>
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isSelected = settings.theme === mode;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.divider,
                    }
                  ]}
                  onPress={() => handleThemeChange(mode)}
                >
                  <Text style={[styles.themeOptionText, { color: isSelected ? '#ffffff' : colors.textSecondary, textTransform: 'capitalize' }]}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Google Cloud Backup & Restore Card */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Google Drive Backup</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Securely back up your logs to your Google AppData space
          </Text>

          {/* Account Status */}
          {googleUser ? (
            <View style={[styles.accountConnectedBox, { backgroundColor: colors.divider }]}>
              <Image
                source={googleUser.photoUrl ? { uri: googleUser.photoUrl } : require('../../assets/images/default_avatar.png')}
                style={styles.userPhoto}
              />
              <View style={[styles.userDetails, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={[styles.userNameText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{googleUser.name}</Text>
                <Text style={[styles.userEmailText, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{googleUser.email}</Text>
              </View>
              <Pressable
                style={[styles.disconnectBtn, { borderColor: colors.border, flexShrink: 0 }]}
                onPress={handleGoogleLogin}
              >
                <Text style={[styles.disconnectBtnText, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>Disconnect</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.googleLoginBtn, { borderColor: colors.border }]}
              onPress={handleGoogleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Image source={require('../../assets/images/google_drive_logo.png')} style={{ width: 20, height: 20 }} />
                  <Text style={[styles.googleLoginBtnText, { color: colors.text }]}>Connect Google Drive</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Backup Frequency Selector */}
          {googleUser && (
            <View style={[styles.inputGroup, { marginTop: Spacing.sm, marginBottom: Spacing.md }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Backup Frequency</Text>
              <View style={styles.themeGroup}>
                {(['daily', 'weekly', 'monthly', 'manual'] as const).map((freq) => {
                  const isSelected = settings.backupFrequency === freq;
                  return (
                    <Pressable
                      key={freq}
                      style={[
                        styles.themeOption,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.divider,
                        }
                      ]}
                      onPress={() => updateSettings({ backupFrequency: freq })}
                    >
                      <Text style={[styles.themeOptionText, { color: isSelected ? '#ffffff' : colors.textSecondary, textTransform: 'capitalize' }]}>
                        {freq}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Backup & Restore Action Buttons */}
          <View style={styles.backupActionsRow}>
            <Pressable
              style={[
                styles.backupBtn,
                { backgroundColor: colors.primary },
                (!googleUser || isSyncing || isRestoring) && { opacity: 0.5 }
              ]}
              onPress={handleCloudBackup}
              disabled={!googleUser || isSyncing || isRestoring}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#ffffff" />
                  <Text style={styles.backupBtnText} numberOfLines={1} adjustsFontSizeToFit>Backup Now</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.backupBtn,
                { backgroundColor: colors.primary },
                (!googleUser || isSyncing || isRestoring) && { opacity: 0.5 }
              ]}
              onPress={handleCloudRestore}
              disabled={!googleUser || isSyncing || isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="cloud-download" size={18} color="#ffffff" />
                  <Text style={styles.backupBtnText} numberOfLines={1} adjustsFontSizeToFit>Restore Data</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Last backup info */}
          {settings.lastBackup && (
            <Text style={[styles.lastBackupText, { color: colors.textMuted }]}>
              Last backup synced: {new Date(settings.lastBackup).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Offline File Backup Card */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Offline Database Backup</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Import/Export raw JSON database files locally
          </Text>

          <View style={styles.localBackupRow}>
            <Pressable
              style={[styles.localBtn, { backgroundColor: colors.divider }]}
              onPress={handleLocalBackup}
            >
              <Ionicons name="share-social-outline" size={16} color={colors.text} />
              <Text style={[styles.localBtnText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Export JSON File</Text>
            </Pressable>

            <Pressable
              style={[styles.localBtn, { backgroundColor: colors.divider }]}
              onPress={handleLocalRestore}
            >
              <Ionicons name="folder-open-outline" size={16} color={colors.text} />
              <Text style={[styles.localBtnText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>Import JSON File</Text>
            </Pressable>
          </View>
        </View>

        {/* Danger Zone / Reset App Card */}
        <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.accent }]}>Danger Zone</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Sign out of Google Drive and completely wipe all local leave logs
          </Text>

          <Pressable
            style={[styles.dangerBtn, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.accent} />
            <Text style={[styles.dangerBtnText, { color: colors.accent }]}>Sign Out & Reset App</Text>
          </Pressable>
        </View>

        {/* App Info Footer */}
        <View style={styles.appInfoContainer}>
          <Text style={[styles.appNameText, { color: colors.text }]}>Personal Leave Tracker</Text>
          <Text style={[styles.appVersionText, { color: colors.textMuted }]}>Version 2.0.5</Text>
          
          <Text style={[styles.appVersionText, { color: colors.textMuted, marginTop: Spacing.md }]}>
            Developer: Sadeesha Sathsara Kumbukage
          </Text>
          <Pressable onPress={handleDevEmail} style={styles.devLinkPressable}>
            <Text style={[styles.appVersionText, { color: colors.primary }]}>sathsarakumbukage@gmail.com</Text>
          </Pressable>
          <Pressable onPress={handleDevWebsite} style={styles.devLinkPressable}>
            <Text style={[styles.appVersionText, { color: colors.primary }]}>sadeeshasathsara.me</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: fs(11),
    marginBottom: Spacing.lg,
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
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: fs(14),
  },
  saveBtn: {
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: fs(14),
    fontWeight: '700',
  },
  themeGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  googleLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  googleLoginBtnText: {
    fontSize: fs(13),
    fontWeight: '600',
  },
  accountConnectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  userPhoto: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.round,
  },
  userPhotoFallback: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 2,
  },
  userNameText: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: fs(11),
  },
  disconnectBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  disconnectBtnText: {
    fontSize: fs(11),
    fontWeight: '700',
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  backupBtnText: {
    color: '#ffffff',
    fontSize: fs(11),
    fontWeight: '700',
  },
  lastBackupText: {
    fontSize: fs(11),
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  localBackupRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  localBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  localBtnText: {
    fontSize: fs(11),
    fontWeight: '600',
  },
  dangerBtn: {
    flexDirection: 'row',
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.sm,
  },
  dangerBtnText: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  appInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  appNameText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  appVersionText: {
    fontSize: fs(11),
  },
  devLinkPressable: {
    marginTop: 4,
  },
  devContainer: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  devItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  devIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  devDetails: {
    flex: 1,
  },
  devLabel: {
    fontSize: fs(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  devValue: {
    fontSize: fs(13),
    fontWeight: '700',
  },
});
