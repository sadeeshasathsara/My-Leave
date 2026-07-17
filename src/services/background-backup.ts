import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { databaseService } from './database';
import { backupService } from './backup';
import { NativeModules } from 'react-native';
import Constants from 'expo-constants';

const BACKGROUND_BACKUP_TASK = 'BACKGROUND_BACKUP_TASK';

// Dynamically load GoogleSignin
let GoogleSignin: any = null;
let isNativeGoogleSupported = false;

if (NativeModules && NativeModules.RNGoogleSignin) {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
      isNativeGoogleSupported = true;
    }
  } catch (e) {
    console.log('[Background Backup] Failed to load GoogleSignin:', e);
  }
}

// Define the background task
TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
  try {
    console.log('[Background Backup] Task woke up');
    
    // 1. Fetch settings from DB
    const settings = await databaseService.getSettings();
    
    // Check if backup is enabled and google user is set
    if (!settings.backupEnabled || !settings.googleUser) {
      console.log('[Background Backup] Backups are disabled or user is not logged in.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // 2. Determine if we need to backup (has calendar day changed?)
    const lastBackupStr = settings.lastBackup;
    const now = new Date();
    let shouldBackup = false;
    
    if (!lastBackupStr) {
      shouldBackup = true;
    } else {
      const lastBackup = new Date(lastBackupStr);
      // Check if calendar day has changed
      const isSameDay = now.getFullYear() === lastBackup.getFullYear() &&
                        now.getMonth() === lastBackup.getMonth() &&
                        now.getDate() === lastBackup.getDate();
      if (!isSameDay) {
        shouldBackup = true;
      }
    }
    
    if (!shouldBackup) {
      console.log('[Background Backup] Backup not needed yet today.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    console.log('[Background Backup] Triggering daily backup...');
    
    // 3. Silent Google sign-in to refresh access token
    let activeUser = settings.googleUser;
    
    // If not simulated
    if (activeUser.accessToken !== 'mock-oauth-token-simulated' && isNativeGoogleSupported && GoogleSignin) {
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          const response = await GoogleSignin.signInSilently();
          const tokens = await GoogleSignin.getTokens();
          const user = response.data?.user || (response as any).user;
          
          activeUser = {
            id: user.id,
            name: user.name || 'User',
            email: user.email,
            photoUrl: user.photo || undefined,
            accessToken: tokens.accessToken,
          };
          
          // Save the updated google user with fresh access token
          await databaseService.saveSettings({
            ...settings,
            googleUser: activeUser,
          });
        } else {
          console.log('[Background Backup] User is not signed in.');
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      } catch (err) {
        console.error('[Background Backup] Google silent login failed:', err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }
    
    // 4. Fetch all leaves from SQLite
    const leaves = await databaseService.getLeaves();
    
    // 5. Upload backup to Google Drive
    const backupTimestamp = await backupService.backupToGoogleDrive(leaves, settings, activeUser);
    
    // 6. Update lastBackup timestamp in SQLite DB
    await databaseService.saveSettings({
      ...settings,
      googleUser: activeUser,
      lastBackup: backupTimestamp,
    });
    
    console.log('[Background Backup] Successfully backed up at:', backupTimestamp);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Backup] Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper functions to register the task
export async function registerBackgroundBackupTask() {
  // Skip registration in Expo Go to avoid Info.plist config errors
  if (Constants.appOwnership === 'expo') {
    console.log('[Background Backup] Registration skipped: Background Fetch is not supported inside Expo Go.');
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
        minimumInterval: 15 * 60, // Check periodically (OS manages exact timing, e.g. every 15-60m)
        stopOnTerminate: false, // Continue running after app is closed
        startOnBoot: true, // Run after device restarts
      });
      console.log('[Background Backup] Registered background fetch successfully.');
    }
  } catch (err) {
    console.error('[Background Backup] Registration failed:', err);
  }
}

// Helper to unregister the task
export async function unregisterBackgroundBackupTask() {
  if (Constants.appOwnership === 'expo') {
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_BACKUP_TASK);
      console.log('[Background Backup] Unregistered background task.');
    }
  } catch (err) {
    console.error('[Background Backup] Unregistration failed:', err);
  }
}
