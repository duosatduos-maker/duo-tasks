import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9a0775abff784d39a4950a8603c98f87',
  appName: 'A Lovable project',
  webDir: 'dist',
  server: {
    url: 'https://9a0775ab-ff78-4d39-a495-0a8603c98f87.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
};

export default config;
