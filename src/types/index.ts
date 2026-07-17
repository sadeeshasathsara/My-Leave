export type LeaveType = 'Casual' | 'Vacation' | 'Duty' | 'Half Day';

export interface LeaveRecord {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
  type: LeaveType;
  createdAt: string; // ISO string
}

export interface LeaveAllocation {
  Casual: number;
  Vacation: number;
  Duty: number;
  'Half Day': number;
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  accessToken: string;
}

export interface UserSettings {
  userName: string;
  email: string;
  theme: 'light' | 'dark' | 'system';
  allocations: LeaveAllocation;
  backupEnabled: boolean;
  lastBackup: string | null;
  hasOnboarded: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  googleUser: GoogleUser | null;
  lastRespondedDate?: string | null;
}

export interface DashboardStats {
  totalTakenThisYear: number;
  byType: Record<LeaveType, number>;
  remainingCasual: number;
  remainingVacation: number;
  remainingDuty: number;
  remainingHalfDay: number;
}
