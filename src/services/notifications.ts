import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure local notification handlers
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  /**
   * Initializes notification permissions, sets up action button categories,
   * and schedules default alarms.
   */
  setup: async (): Promise<boolean> => {
    try {
      // 1. Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Permission not granted.');
        return false;
      }

      // 2. Define action buttons (Yes/No)
      // YES: Launches app to foreground to open the leave modal
      // NO: Also launches app to foreground to record response date & show success toast
      await Notifications.setNotificationCategoryAsync('leave-check', [
        {
          identifier: 'YES',
          buttonTitle: 'Yes',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'NO',
          buttonTitle: 'No',
          options: { opensAppToForeground: true },
        },
      ]);

      // 3. Schedule the daily triggers
      await notificationService.scheduleDefaultNotifications();
      return true;
    } catch (error) {
      console.error('[NotificationService] Setup failed:', error);
      return false;
    }
  },

  /**
   * Schedules standard recurring daily alarms at 9:00 AM and 9:00 PM.
   */
  scheduleDefaultNotifications: async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      const has9am = scheduled.some((n) => n.identifier === 'leave-check-9am');
      const has9pm = scheduled.some((n) => n.identifier === 'leave-check-9pm');

      // Schedule 9 AM alarm if missing
      if (!has9am) {
        await Notifications.scheduleNotificationAsync({
          identifier: 'leave-check-9am',
          content: {
            title: 'Leave Check',
            body: 'Did you take a leave today?',
            categoryIdentifier: 'leave-check',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
          } as any,
        });
        console.log('[NotificationService] Scheduled 9:00 AM daily check.');
      }

      // Schedule 9 PM alarm if missing
      if (!has9pm) {
        await Notifications.scheduleNotificationAsync({
          identifier: 'leave-check-9pm',
          content: {
            title: 'Leave Check',
            body: 'Did you take a leave today?',
            categoryIdentifier: 'leave-check',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 21,
            minute: 0,
          } as any,
        });
        console.log('[NotificationService] Scheduled 9:00 PM daily check.');
      }
    } catch (err) {
      console.error('[NotificationService] Scheduling default notifications failed:', err);
    }
  },

  /**
   * Deletes today's 9 PM notification and reschedules it to start from tomorrow 9 PM.
   * This is used when the user responds to the 9 AM notification or opens the app.
   */
  dismissNinePMForToday: async () => {
    try {
      // 1. Cancel today's 9 PM slot
      await Notifications.cancelScheduledNotificationAsync('leave-check-9pm');
      console.log('[NotificationService] Canceled today\'s 9:00 PM check.');

      // 2. Schedule the next 9 PM alarm starting tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(21, 0, 0, 0);

      await Notifications.scheduleNotificationAsync({
        identifier: 'leave-check-9pm',
        content: {
          title: 'Leave Check',
          body: 'Did you take a leave today?',
          categoryIdentifier: 'leave-check',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 21,
          minute: 0,
        } as any,
      });
      console.log('[NotificationService] Rescheduled 9:00 PM check to start tomorrow.');
    } catch (err) {
      console.error('[NotificationService] Dismissing 9 PM alarm failed:', err);
    }
  },
};
