import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { LeaveRecord, UserSettings } from '../types';

const DATABASE_NAME = 'myleave.db';
const isWeb = Platform.OS === 'web';

// LocalStorage Keys for Web fallback
const WEB_LEAVES_KEY = 'myleave_leaves_db';
const WEB_SETTINGS_KEY = 'myleave_settings_db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the cached database connection, opening it if necessary.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return db;
}

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Default User',
  email: '',
  theme: 'system',
  allocations: {
    Casual: 10,
    Vacation: 15,
    Duty: 5,
    'Half Day': 10,
  },
  backupEnabled: false,
  lastBackup: null,
  hasOnboarded: false,
  backupFrequency: 'weekly',
  googleUser: null,
};

export const databaseService = {
  /**
   * Initializes the database, creating the tables if they don't exist
   * and seeding default settings. Automatically migrates outdated schemas.
   */
  initializeDb: async (): Promise<void> => {
    try {
      if (isWeb) {
        console.log('Web environment detected. Initializing LocalStorage Database...');

        const settingsRaw = localStorage.getItem(WEB_SETTINGS_KEY);
        if (!settingsRaw) {
          localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        } else {
          // Verify and migrate Web allocations keys if needed
          const settingsObj = JSON.parse(settingsRaw);
          if (settingsObj.allocations && (settingsObj.allocations.Annual !== undefined || settingsObj.allocations.Sick !== undefined)) {
            console.log('[Web Migration] Migrating settings structure to Casual/Vacation/Duty...');
            localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify([]));
          }
        }

        const leavesRaw = localStorage.getItem(WEB_LEAVES_KEY);
        if (!leavesRaw) {
          localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify([]));
        }
        console.log('LocalStorage Database initialized successfully.');
        return;
      }

      // Native SQLite branch
      const database = await getDb();

      await database.execAsync('PRAGMA foreign_keys = ON;');

      // Schema compatibility verification
      try {
        const tableInfo = await database.getAllAsync<any>("PRAGMA table_info(leaves)");
        const hasOldSchema = tableInfo.some(col => col.name === 'startDate' || col.name === 'endDate' || col.name === 'title');
        
        if (hasOldSchema) {
          console.log('[Migration] Legacy SQLite schema detected. Dropping outdated leaves table...');
          await database.execAsync('DROP TABLE IF EXISTS leaves;');
        }
      } catch (err) {
        console.error('[Migration] Verification failed:', err);
      }

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS leaves (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          reason TEXT NOT NULL,
          type TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
      `);

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Seed/Migrate Settings
      const rows = await database.getAllAsync<{ count: number }>(
        'SELECT count(*) as count FROM settings WHERE key = "user_settings"'
      );
      const count = rows[0]?.count ?? 0;
      
      let needsSettingsReset = false;
      if (count > 0) {
        // Read settings and verify properties
        const settingsRows = await database.getAllAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = "user_settings"'
        );
        const savedSettings = JSON.parse(settingsRows[0]?.value || '{}');
        if (savedSettings.allocations && (savedSettings.allocations.Annual !== undefined || savedSettings.allocations.Sick !== undefined)) {
          console.log('[Migration] Allocations schema out of date. Resetting settings and leaves tables...');
          needsSettingsReset = true;
          await database.execAsync('DELETE FROM leaves;');
        }
      }

      if (count === 0 || needsSettingsReset) {
        await database.runAsync(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          ['user_settings', JSON.stringify(DEFAULT_SETTINGS)]
        );
      }

      console.log('SQLite Database initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Database:', error);
      throw error;
    }
  },

  /**
   * Fetches all leave records from the database.
   */
  getLeaves: async (): Promise<LeaveRecord[]> => {
    try {
      if (isWeb) {
        const leavesRaw = localStorage.getItem(WEB_LEAVES_KEY);
        if (leavesRaw) {
          const list = JSON.parse(leavesRaw) as LeaveRecord[];
          return list.sort((a, b) => b.date.localeCompare(a.date));
        }
        return [];
      }

      const database = await getDb();
      const rows = await database.getAllAsync<any>('SELECT * FROM leaves ORDER BY date DESC');

      return rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        reason: row.reason,
        type: row.type as any,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error('Database getLeaves error:', error);
      return [];
    }
  },

  /**
   * Inserts a new leave record.
   */
  insertLeave: async (leave: LeaveRecord): Promise<void> => {
    try {
      if (isWeb) {
        const leavesRaw = localStorage.getItem(WEB_LEAVES_KEY) || '[]';
        const list = JSON.parse(leavesRaw) as LeaveRecord[];
        list.push(leave);
        localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify(list));
        return;
      }

      const database = await getDb();
      await database.runAsync(
        `INSERT INTO leaves (id, date, reason, type, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          leave.id,
          leave.date,
          leave.reason,
          leave.type,
          leave.createdAt,
        ]
      );
    } catch (error) {
      console.error('Database insertLeave error:', error);
      throw error;
    }
  },

  /**
   * Updates an existing leave record.
   */
  updateLeave: async (leave: LeaveRecord): Promise<void> => {
    try {
      if (isWeb) {
        const leavesRaw = localStorage.getItem(WEB_LEAVES_KEY) || '[]';
        let list = JSON.parse(leavesRaw) as LeaveRecord[];
        list = list.map((item) => (item.id === leave.id ? leave : item));
        localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify(list));
        return;
      }

      const database = await getDb();
      await database.runAsync(
        `UPDATE leaves
         SET date = ?, reason = ?, type = ?
         WHERE id = ?`,
        [
          leave.date,
          leave.reason,
          leave.type,
          leave.id,
        ]
      );
    } catch (error) {
      console.error('Database updateLeave error:', error);
      throw error;
    }
  },

  /**
   * Deletes a leave record by ID.
   */
  deleteLeave: async (id: string): Promise<void> => {
    try {
      if (isWeb) {
        const leavesRaw = localStorage.getItem(WEB_LEAVES_KEY) || '[]';
        let list = JSON.parse(leavesRaw) as LeaveRecord[];
        list = list.filter((item) => item.id !== id);
        localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify(list));
        return;
      }

      const database = await getDb();
      await database.runAsync('DELETE FROM leaves WHERE id = ?', [id]);
    } catch (error) {
      console.error('Database deleteLeave error:', error);
      throw error;
    }
  },

  /**
   * Fetches user settings.
   */
  getSettings: async (): Promise<UserSettings> => {
    try {
      if (isWeb) {
        const settingsRaw = localStorage.getItem(WEB_SETTINGS_KEY);
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw);
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            allocations: {
              ...DEFAULT_SETTINGS.allocations,
              ...parsed.allocations,
            },
          };
        }
      } else {
        const database = await getDb();
        const rows = await database.getAllAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = "user_settings"'
        );
        const row = rows[0];
        if (row) {
          const parsed = JSON.parse(row.value);
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            allocations: {
              ...DEFAULT_SETTINGS.allocations,
              ...parsed.allocations,
            },
          };
        }
      }
      throw new Error('Settings not found');
    } catch (error) {
      console.error('Database getSettings error:', error);
      return { ...DEFAULT_SETTINGS };
    }
  },

  /**
   * Saves user settings.
   */
  saveSettings: async (settings: UserSettings): Promise<void> => {
    try {
      if (isWeb) {
        localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(settings));
        return;
      }

      const database = await getDb();
      await database.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['user_settings', JSON.stringify(settings)]
      );
    } catch (error) {
      console.error('Database saveSettings error:', error);
      throw error;
    }
  },

  /**
   * Wipes and replaces all leaves (used during cloud restore).
   */
  replaceAllLeaves: async (leaves: LeaveRecord[]): Promise<void> => {
    try {
      if (isWeb) {
        localStorage.setItem(WEB_LEAVES_KEY, JSON.stringify(leaves));
        return;
      }

      const database = await getDb();

      await database.withTransactionAsync(async () => {
        await database.runAsync('DELETE FROM leaves');
        for (const leave of leaves) {
          await database.runAsync(
            `INSERT INTO leaves (id, date, reason, type, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
              leave.id,
              leave.date,
              leave.reason,
              leave.type,
              leave.createdAt,
            ]
          );
        }
      });
    } catch (error) {
      console.error('Database replaceAllLeaves error:', error);
      throw error;
    }
  },
};
