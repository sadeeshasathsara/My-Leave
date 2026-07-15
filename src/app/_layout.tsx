import { useEffect, useRef, useState } from 'react';
import { useColorScheme, Modal, View, Text, Pressable, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Tabs } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLeaveStore } from '../storage/store';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { AnimatedSplashOverlay } from '../components/animated-icon';
import OnboardingScreen from '../components/onboarding';
import AddLeaveScreen from './add';
import { ToastRenderer } from '../components/toast';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notifications';
import { GoogleUser, LeaveRecord, UserSettings } from '../types';
import { fs } from '../constants/layout';

/** Year dropdown shown in the top-right of every screen header */
function YearDropdown({ colors }: { colors: typeof Colors.light | typeof Colors.dark }) {
  const selectedYear = useLeaveStore((s) => s.selectedYear);
  const setSelectedYear = useLeaveStore((s) => s.setSelectedYear);
  const getAvailableYears = useLeaveStore((s) => s.getAvailableYears);

  const [open, setOpen] = useState(false);
  const availableYears = getAvailableYears();

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        style={[styles.yearBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.yearBtnText, { color: colors.primary }]}>{selectedYear}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.primary} />
      </Pressable>

      {/* Year Picker Modal */}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.yearPickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.yearPickerTitle, { color: colors.textSecondary }]}>Select Year</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
                  {availableYears.map((yr) => {
                    const isSelected = yr === selectedYear;
                    return (
                      <Pressable
                        key={yr}
                        style={[
                          styles.yearPickerItem,
                          { borderBottomColor: colors.divider },
                          isSelected && { backgroundColor: colors.primary + '12' },
                        ]}
                        onPress={() => {
                          setSelectedYear(yr);
                          setOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.yearPickerItemText,
                            { color: isSelected ? colors.primary : colors.text },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {yr}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const loadInitialData = useLeaveStore((state) => state.loadInitialData);
  const themeSetting = useLeaveStore((state) => state.settings.theme);

  const isLoading = useLeaveStore((state) => state.isLoading);
  const settings = useLeaveStore((state) => state.settings);
  const updateSettings = useLeaveStore((state) => state.updateSettings);
  const restoreFromBackup = useLeaveStore((state) => state.restoreFromBackup);

  // Modal States from Store
  const isAddLeaveModalOpen = useLeaveStore((state) => state.isAddLeaveModalOpen);
  const editLeaveId = useLeaveStore((state) => state.editLeaveId);
  const modalInitialDate = useLeaveStore((state) => state.modalInitialDate);
  const setAddLeaveModalOpen = useLeaveStore((state) => state.setAddLeaveModalOpen);

  // Initialize DB and state on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Configure notifications and responses once settings are loaded
  useEffect(() => {
    if (isLoading) return;

    if (settings.hasOnboarded) {
      notificationService.setup();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionId = response.actionIdentifier;
      const todayStr = new Date().toISOString().split('T')[0];

      // Update response tracker in settings
      await useLeaveStore.getState().updateSettings({
        lastRespondedDate: todayStr,
      });

      // Defuse 9 PM check if already answered
      await notificationService.dismissNinePMForToday();

      if (actionId === 'YES') {
        useLeaveStore.getState().setAddLeaveModalOpen(true, null);
        useLeaveStore.getState().showToast('Verify Leave Log', 'Please complete your leave entry details below.', 'info');
      } else if (actionId === 'NO') {
        useLeaveStore.getState().showToast('Response Confirmed', 'Thank you for verifying!', 'success');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoading, settings.hasOnboarded]);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];
  const defaultTheme = activeTheme === 'dark' ? DarkTheme : DefaultTheme;

  // Custom React Navigation Themes
  const customTheme = {
    dark: activeTheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: defaultTheme.fonts,
  };

  const handleOnboardingComplete = async (
    userData: { userName: string; email: string; googleUser: GoogleUser | null; backupEnabled: boolean },
    restoreData?: { leaves: LeaveRecord[]; settings: UserSettings }
  ) => {
    if (restoreData) {
      await restoreFromBackup(restoreData.leaves, {
        ...restoreData.settings,
        hasOnboarded: true,
      });
    } else {
      await updateSettings({
        userName: userData.userName,
        email: userData.email,
        googleUser: userData.googleUser,
        backupEnabled: userData.backupEnabled,
        hasOnboarded: true,
      });
    }
  };

  if (isLoading) {
    return (
      <ThemeProvider value={customTheme}>
        <AnimatedSplashOverlay />
      </ThemeProvider>
    );
  }

  if (!settings.hasOnboarded) {
    return (
      <ThemeProvider value={customTheme}>
        <AnimatedSplashOverlay />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </ThemeProvider>
    );
  }

  // Shared header options for all screens
  const sharedHeaderOptions = {
    headerStyle: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
    } as any,
    headerTitleStyle: {
      fontWeight: '700' as const,
      fontSize: fs(17),
      color: colors.text,
    },
    headerTitleAlign: 'left' as const,
    headerRight: () => <YearDropdown colors={colors} />,
    headerRightContainerStyle: { paddingRight: Spacing.lg },
  };

  return (
    <ThemeProvider value={customTheme}>
      {/* Animated Splash Screen Overlay */}
      <AnimatedSplashOverlay />

      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 74,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 8,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            ...sharedHeaderOptions,
            title: 'Dashboard',
            headerTitle: 'My Leave Tracker',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            ...sharedHeaderOptions,
            title: 'Calendar',
            headerTitle: 'Leave Calendar',
            tabBarLabel: 'Calendar',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            ...sharedHeaderOptions,
            title: 'Record Leave',
            headerTitle: 'Record Leave',
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={[
                styles.fabIcon,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  borderColor: colors.card,
                }
              ]}>
                <Ionicons name="add" size={30} color="#ffffff" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setAddLeaveModalOpen(true, null);
            },
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            ...sharedHeaderOptions,
            title: 'Reports',
            headerTitle: 'Export Reports',
            tabBarLabel: 'Reports',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            ...sharedHeaderOptions,
            title: 'Settings',
            headerTitle: 'Settings',
            tabBarLabel: 'Settings',
            // Settings doesn't need year dropdown — override headerRight
            headerRight: undefined,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Professional Slide-Up Bottom-to-Top Add/Edit Leave Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isAddLeaveModalOpen}
        onRequestClose={() => setAddLeaveModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <AddLeaveScreen
            isModal={true}
            onClose={() => setAddLeaveModalOpen(false)}
            modalEditId={editLeaveId || undefined}
            modalInitialDate={modalInitialDate || undefined}
          />
        </View>
      </Modal>

      {/* Global custom toast notifications */}
      <ToastRenderer />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  yearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  yearBtnText: {
    fontSize: fs(13),
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: Spacing.lg,
  },
  yearPickerCard: {
    width: 150,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  yearPickerTitle: {
    fontSize: fs(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  yearPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  yearPickerItemText: {
    fontSize: fs(15),
    fontWeight: '500',
  },
  fabIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    // shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
});
