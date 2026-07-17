import { create } from 'zustand';
import { databaseService } from '../services/database';
import { LeaveRecord, UserSettings, LeaveType, DashboardStats } from '../types';
import { registerBackgroundBackupTask, unregisterBackgroundBackupTask } from '../services/background-backup';


export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  type: ToastType;
}

interface LeaveState {
  leaves: LeaveRecord[];
  settings: UserSettings;
  isLoading: boolean;

  // Toast notification
  toast: ToastState;
  showToast: (title: string, message?: string, type?: ToastType) => void;
  hideToast: () => void;

  // Modal states
  isAddLeaveModalOpen: boolean;
  editLeaveId: string | null;
  modalInitialDate: string | null;

  // Global Year Filter (Jan 1 – Dec 31)
  selectedYear: number;

  // Legacy filter states (used by getFilteredLeaves)
  searchQuery: string;
  selectedTypeFilter: LeaveType | 'All';
  selectedYearFilter: number | 'All';

  // Core Actions
  loadInitialData: () => Promise<void>;
  addLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateLeave: (leave: LeaveRecord) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  restoreFromBackup: (leaves: LeaveRecord[], settings: UserSettings) => Promise<void>;
  logoutAndClearData: () => Promise<void>;
  setAddLeaveModalOpen: (open: boolean, editId?: string | null, initialDate?: string | null) => void;

  // Year selector
  setSelectedYear: (year: number) => void;

  // Filter setters
  setSearchQuery: (query: string) => void;
  setSelectedTypeFilter: (type: LeaveType | 'All') => void;
  setSelectedYearFilter: (year: number | 'All') => void;

  // Getters & Derived stats
  getStats: (year?: number) => DashboardStats;
  getMonthStats: (year: number, month: number) => Record<LeaveType, number>;
  getAvailableYears: () => number[];
  getFilteredLeaves: () => LeaveRecord[];
}

export const useLeaveStore = create<LeaveState>((set, get) => ({
  leaves: [],
  settings: {
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
  },
  isLoading: true,
  toast: { visible: false, title: '', message: '', type: 'info' },
  isAddLeaveModalOpen: false,
  editLeaveId: null,
  modalInitialDate: null,

  // Default to current calendar year
  selectedYear: new Date().getFullYear(),

  searchQuery: '',
  selectedTypeFilter: 'All',
  selectedYearFilter: new Date().getFullYear(),

  showToast: (title, message = '', type = 'info') => {
    set({ toast: { visible: true, title, message, type } });
  },

  hideToast: () => {
    set((state) => ({ toast: { ...state.toast, visible: false } }));
  },

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      await databaseService.initializeDb();
      const leaves = await databaseService.getLeaves();
      const settings = await databaseService.getSettings();

      // Auto-migrate legacy users who existed before onboarding was introduced
      if (settings.hasOnboarded === undefined) {
        settings.hasOnboarded = leaves.length > 0;
        await databaseService.saveSettings(settings);
      }

      set({ leaves, settings, isLoading: false });
    } catch (error) {
      console.error('Error loading initial data from SQLite:', error);
      set({ isLoading: false });
    }
  },

  addLeave: async (leave) => {
    try {
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();
      const newLeave: LeaveRecord = {
        ...leave,
        id,
        createdAt,
      };

      await databaseService.insertLeave(newLeave);

      set((state) => ({
        leaves: [newLeave, ...state.leaves],
      }));
    } catch (error) {
      console.error('Error adding leave record:', error);
      throw error;
    }
  },

  updateLeave: async (leave) => {
    try {
      await databaseService.updateLeave(leave);
      set((state) => ({
        leaves: state.leaves.map((item) => (item.id === leave.id ? leave : item)),
      }));
    } catch (error) {
      console.error('Error updating leave record:', error);
      throw error;
    }
  },

  deleteLeave: async (id) => {
    try {
      await databaseService.deleteLeave(id);
      set((state) => ({
        leaves: state.leaves.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting leave record:', error);
      throw error;
    }
  },

  updateSettings: async (newSettings) => {
    const updatedSettings = {
      ...get().settings,
      ...newSettings,
    };
    try {
      await databaseService.saveSettings(updatedSettings);
      set({ settings: updatedSettings });

      // Auto-register/unregister daily background backup task
      if (updatedSettings.hasOnboarded && updatedSettings.backupEnabled) {
        registerBackgroundBackupTask();
      } else {
        unregisterBackgroundBackupTask();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  restoreFromBackup: async (backupLeaves, backupSettings) => {
    try {
      await databaseService.replaceAllLeaves(backupLeaves);
      await databaseService.saveSettings(backupSettings);
      set({
        leaves: backupLeaves,
        settings: backupSettings,
      });

      // Auto-register/unregister backup task after restore
      if (backupSettings.hasOnboarded && backupSettings.backupEnabled) {
        registerBackgroundBackupTask();
      } else {
        unregisterBackgroundBackupTask();
      }
    } catch (error) {
      console.error('Error restoring backup data:', error);
      throw error;
    }
  },

  logoutAndClearData: async () => {
    try {
      // 1. Sign out of Google Sign-in if native libraries are supported
      try {
        await unregisterBackgroundBackupTask();
        const { NativeModules } = require('react-native');
        if (NativeModules && NativeModules.RNGoogleSignin) {
          const GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
          if (GoogleSignin && typeof GoogleSignin.signOut === 'function') {
            await GoogleSignin.signOut();
          }
        }
      } catch (e) {
        console.log('[Store] Google Sign-Out skipped or native module missing.');
      }

      // 2. Clear all local leave entries in database
      await databaseService.replaceAllLeaves([]);

      // 3. Reset settings to system default and set onboarding flag to false
      const defaultSettings: UserSettings = {
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
      await databaseService.saveSettings(defaultSettings);

      // 4. Apply clean states back to the store
      set({
        leaves: [],
        settings: defaultSettings,
        selectedYear: new Date().getFullYear(),
      });
    } catch (error) {
      console.error('Error logging out and clearing data:', error);
      throw error;
    }
  },

  setAddLeaveModalOpen: (open, editId = null, initialDate = null) => {
    set({ isAddLeaveModalOpen: open, editLeaveId: editId, modalInitialDate: initialDate });
  },

  setSelectedYear: (year) => set({ selectedYear: year }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTypeFilter: (type) => set({ selectedTypeFilter: type }),
  setSelectedYearFilter: (year) => set({ selectedYearFilter: year }),

  /**
   * Returns all unique years present in leave records, plus current year.
   * Sorted descending (most recent first).
   */
  getAvailableYears: () => {
    const { leaves } = get();
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    leaves.forEach((l) => {
      const yr = new Date(l.date).getFullYear();
      if (!isNaN(yr)) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  },

  /**
   * Returns stats (byType counts) for a specific MONTH within a YEAR.
   * Used by the 3 dashboard summary cards (current month view).
   */
  getMonthStats: (year: number, month: number) => {
    const { leaves } = get();
    const byType: Record<LeaveType, number> = { Casual: 0, Vacation: 0, Duty: 0, 'Half Day': 0 };

    leaves.forEach((leave) => {
      const d = new Date(leave.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (byType[leave.type] !== undefined) {
          byType[leave.type] += 1;
        }
      }
    });

    return byType;
  },

  /**
   * Returns annual stats for the given year (defaults to selectedYear).
   */
  getStats: (year?: number) => {
    const { leaves, settings, selectedYear } = get();
    const targetYear = year ?? selectedYear;

    // Filter leaves for the target year (Jan 1 – Dec 31)
    const activeLeavesThisYear = leaves.filter((leave) => {
      const leaveYear = new Date(leave.date).getFullYear();
      return leaveYear === targetYear;
    });

    const totalTakenThisYear = activeLeavesThisYear.reduce((acc, leave) => {
      return acc + (leave.type === 'Half Day' ? 0.5 : 1);
    }, 0);

    // Group leaves by type (counting 1 entry as 1 logged half day, as requested)
    const byType: Record<LeaveType, number> = {
      Casual: 0,
      Vacation: 0,
      Duty: 0,
      'Half Day': 0,
    };

    activeLeavesThisYear.forEach((leave) => {
      if (byType[leave.type] !== undefined) {
        byType[leave.type] += 1;
      }
    });

    // Remaining balances kept for type signature compliance; allocations are not capped
    const remainingCasual = Math.max(0, settings.allocations.Casual - byType['Casual']);
    const remainingVacation = Math.max(0, settings.allocations.Vacation - byType['Vacation']);
    const remainingDuty = Math.max(0, settings.allocations.Duty - byType['Duty']);
    const remainingHalfDay = Math.max(0, (settings.allocations['Half Day'] || 10) - byType['Half Day']);

    return {
      totalTakenThisYear,
      byType,
      remainingCasual,
      remainingVacation,
      remainingDuty,
      remainingHalfDay,
    };
  },

  getFilteredLeaves: () => {
    const { leaves, searchQuery, selectedTypeFilter, selectedYearFilter } = get();

    return leaves.filter((leave) => {
      const matchesSearch = leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypeFilter === 'All' || leave.type === selectedTypeFilter;
      const leaveYear = new Date(leave.date).getFullYear();
      const matchesYear = selectedYearFilter === 'All' || leaveYear === selectedYearFilter;
      return matchesSearch && matchesType && matchesYear;
    });
  },
}));
