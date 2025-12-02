import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface Alarm {
  id: string;
  time: string;
  label: string | null;
  active: boolean;
}

export class AlarmNotificationService {
  static async requestPermissions() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not a native platform, skipping permissions');
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleAlarm(alarm: Alarm) {
    if (!Capacitor.isNativePlatform() || !alarm.active) {
      console.log('Skipping alarm schedule - not native or alarm inactive');
      return;
    }

    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('Notification permissions not granted');
        return;
      }

      // Parse the time (HH:MM:SS format)
      const [hours, minutes] = alarm.time.split(':').map(Number);
      
      // Create a date for today at the alarm time
      const now = new Date();
      const alarmDate = new Date();
      alarmDate.setHours(hours, minutes, 0, 0);

      // If the alarm time has passed today, schedule for tomorrow
      if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      // Cancel any existing notification with this ID
      await LocalNotifications.cancel({ notifications: [{ id: parseInt(alarm.id.slice(0, 8), 16) }] });

      // Schedule the notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Alarm',
            body: alarm.label || 'Time to wake up!',
            id: parseInt(alarm.id.slice(0, 8), 16), // Convert UUID to number
            schedule: { at: alarmDate, repeats: true, every: 'day' },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: { alarmId: alarm.id }
          }
        ]
      });

      console.log(`Alarm scheduled for ${alarmDate.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling alarm:', error);
    }
  }

  static async cancelAlarm(alarmId: string) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const notificationId = parseInt(alarmId.slice(0, 8), 16);
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log(`Alarm ${alarmId} cancelled`);
    } catch (error) {
      console.error('Error cancelling alarm:', error);
    }
  }

  static async cancelAllAlarms() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      console.log('All alarms cancelled');
    } catch (error) {
      console.error('Error cancelling all alarms:', error);
    }
  }

  static async updateAlarm(alarm: Alarm) {
    if (alarm.active) {
      await this.scheduleAlarm(alarm);
    } else {
      await this.cancelAlarm(alarm.id);
    }
  }
}
