import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { NativeModules } from 'react-native';
import { LeaveRecord, UserSettings, GoogleUser } from '../types';

// IMPORTANT: Replace these with your actual OAuth Client IDs from your Google Cloud Console project.
// The Web Client ID is required for Android login token exchange.
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

export interface BackupPayload {
  version: string;
  timestamp: string;
  settings: UserSettings;
  leaves: LeaveRecord[];
}

// Dynamically load GoogleSignin only if the native module is registered in the binary (prevents Expo Go crashes)
let GoogleSignin: any = null;
let isNativeGoogleSupported = false;

if (NativeModules && NativeModules.RNGoogleSignin) {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
      isNativeGoogleSupported = true;
    }
  } catch (e) {
    console.log('[BackupService] Failed to load GoogleSignin:', e);
  }
} else {
  console.log('[BackupService] Native RNGoogleSignin module not found in binary. Falling back to Simulation Mode.');
}

let isGoogleConfigured = false;

function ensureGoogleConfigured() {
  if (isNativeGoogleSupported && !isGoogleConfigured && GoogleSignin) {
    try {
      const config: any = {
        scopes: ['https://www.googleapis.com/auth/drive.appdata'],
        offlineAccess: true,
      };
      if (GOOGLE_WEB_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID.includes('YOUR_')) {
        config.webClientId = GOOGLE_WEB_CLIENT_ID;
      }
      if (GOOGLE_IOS_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID.includes('YOUR_')) {
        config.iosClientId = GOOGLE_IOS_CLIENT_ID;
      }
      GoogleSignin.configure(config);
      isGoogleConfigured = true;
    } catch (err) {
      console.error('[BackupService] Failed to configure Google Sign-In, switching to simulation:', err);
      isNativeGoogleSupported = false;
    }
  }
}

/**
 * Searches the Google Drive appDataFolder for the 'myleave_backup.json' file.
 * Returns the file ID if found, or null otherwise.
 */
async function findBackupFileId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27myleave_backup.json%27',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive search failed:', errorText);
      throw new Error(`Google Drive API search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const files = data.files || [];
    return files.length > 0 ? files[0].id : null;
  } catch (err) {
    console.error('Error in findBackupFileId:', err);
    throw err;
  }
}

export const backupService = {
  /**
   * Serializes the current state of leaves and settings into a JSON backup payload.
   */
  createBackupPayload: (leaves: LeaveRecord[], settings: UserSettings): BackupPayload => {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings,
      leaves,
    };
  },

  /**
   * Exports data to a local JSON file that the user can save or share.
   */
  exportLocalBackup: async (leaves: LeaveRecord[], settings: UserSettings): Promise<void> => {
    try {
      const payload = backupService.createBackupPayload(leaves, settings);
      const jsonString = JSON.stringify(payload, null, 2);
      
      const fileUri = `${FileSystem.documentDirectory}My_Leave_Backup.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share or Save Leave Backup File',
        UTI: 'public.json',
      });
    } catch (error) {
      console.error('Error exporting local backup:', error);
      throw error;
    }
  },

  /**
   * Imports data from a local JSON backup file picked by the user.
   */
  importLocalBackup: async (): Promise<BackupPayload> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        throw new Error('Backup import canceled.');
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed: BackupPayload = JSON.parse(fileContent);
      
      if (!parsed.version || !parsed.leaves || !parsed.settings) {
        throw new Error('Invalid backup file format.');
      }

      return parsed;
    } catch (error) {
      console.error('Error importing local backup:', error);
      throw error;
    }
  },

  /**
   * Performs Google Sign-In authentication.
   * Gracefully falls back to simulated onboarding check in Expo Go.
   */
  signInWithGoogle: async (): Promise<GoogleUser> => {
    if (!isNativeGoogleSupported || !GoogleSignin) {
      console.log('[BackupService] Native library missing or running on simulator/Expo Go. Resolving mock user...');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'google-user-simulated',
            name: 'Personal Account (Simulated)',
            email: 'user@gmail.com',
            photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
            accessToken: 'mock-oauth-token-simulated',
          });
        }, 1500);
      });
    }

    ensureGoogleConfigured();
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      const user = response.data?.user || (response as any).user;

      if (!user) {
        throw new Error('User info is missing in Google response.');
      }

      return {
        id: user.id,
        name: user.name || 'User',
        email: user.email,
        photoUrl: user.photo || undefined,
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      console.error('Google Sign-In Failure:', error);
      throw error;
    }
  },

  /**
   * Uploads or updates the backup payload in the Google Drive appDataFolder.
   * Falls back to local file system simulation in Expo Go.
   */
  backupToGoogleDrive: async (
    leaves: LeaveRecord[],
    settings: UserSettings,
    user: GoogleUser
  ): Promise<string> => {
    if (!isNativeGoogleSupported || user.accessToken === 'mock-oauth-token-simulated') {
      console.log('[BackupService] Running local file system simulation backup...');
      return new Promise((resolve, reject) => {
        const payload = backupService.createBackupPayload(leaves, settings);
        setTimeout(() => {
          const simulatedCloudPath = `${FileSystem.documentDirectory}google_drive_simulated_backup.json`;
          FileSystem.writeAsStringAsync(simulatedCloudPath, JSON.stringify(payload))
            .then(() => resolve(new Date().toISOString()))
            .catch(reject);
        }, 1800);
      });
    }

    try {
      const payload = backupService.createBackupPayload(leaves, settings);
      const accessToken = user.accessToken;

      const fileId = await findBackupFileId(accessToken);

      if (fileId) {
        // File exists -> PATCH update content
        const response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error('Google Drive file update failed:', errText);
          throw new Error(`Google Drive backup update failed: ${response.statusText}`);
        }
      } else {
        // File does not exist -> POST new file via multipart/related
        const metadata = {
          name: 'myleave_backup.json',
          parents: ['appDataFolder'],
        };
        const boundary = 'myleave_multipart_boundary_xyz';
        const multipartBody = 
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${JSON.stringify(payload)}\r\n` +
          `--${boundary}--`;

        const response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error('Google Drive file creation failed:', errText);
          throw new Error(`Google Drive backup creation failed: ${response.statusText}`);
        }
      }

      return new Date().toISOString();
    } catch (error) {
      console.error('Google Drive backup sync error:', error);
      throw error;
    }
  },

  /**
   * Restores leave database and user preferences from Google Drive.
   * Falls back to local file system simulation in Expo Go.
   */
  restoreFromGoogleDrive: async (user: GoogleUser): Promise<BackupPayload> => {
    if (!isNativeGoogleSupported || user.accessToken === 'mock-oauth-token-simulated') {
      console.log('[BackupService] Running local file system simulation restore...');
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const simulatedCloudPath = `${FileSystem.documentDirectory}google_drive_simulated_backup.json`;
            const exists = await FileSystem.getInfoAsync(simulatedCloudPath);
            if (!exists.exists) {
              return reject(new Error('No backup file found in Google Drive appDataFolder (Simulated). Please sync first.'));
            }
            const fileContent = await FileSystem.readAsStringAsync(simulatedCloudPath);
            const parsed: BackupPayload = JSON.parse(fileContent);
            resolve(parsed);
          } catch (error) {
            reject(new Error('Failed to read simulated backup file from storage.'));
          }
        }, 1800);
      });
    }

    try {
      const accessToken = user.accessToken;
      const fileId = await findBackupFileId(accessToken);

      if (!fileId) {
        throw new Error('No backup file found in Google Drive appDataFolder. Please perform a backup first.');
      }

      // Fetch the actual media file contents
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Failed to download Google Drive backup:', errText);
        throw new Error(`Google Drive download failed: ${response.statusText}`);
      }

      const payload: BackupPayload = await response.json();
      
      if (!payload.version || !payload.leaves || !payload.settings) {
        throw new Error('Restored backup JSON is in an invalid format.');
      }

      return payload;
    } catch (error) {
      console.error('Google Drive restore sync error:', error);
      throw error;
    }
  },
};
