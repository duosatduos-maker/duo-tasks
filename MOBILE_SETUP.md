# Mobile App Setup Guide

Your app is now configured as a native mobile app with alarm functionality!

## Setup Steps

1. **Export to GitHub**
   - Click "Export to GitHub" button in Lovable
   - Clone the repository to your computer

2. **Install Dependencies**
   ```bash
   cd your-project
   npm install
   ```

3. **Build the Web App**
   ```bash
   npm run build
   ```

4. **Add Native Platforms**
   
   For Android:
   ```bash
   npx cap add android
   ```
   
   For iOS:
   ```bash
   npx cap add ios
   ```

5. **Sync the Project**
   ```bash
   npx cap sync
   ```

6. **Open in Native IDE**
   
   For Android (requires Android Studio):
   ```bash
   npx cap open android
   ```
   
   For iOS (requires Xcode on Mac):
   ```bash
   npx cap open ios
   ```

7. **Run on Device/Emulator**
   
   For Android:
   ```bash
   npx cap run android
   ```
   
   For iOS:
   ```bash
   npx cap run ios
   ```

## How It Works

- **Alarm Syncing**: When either user creates an alarm, it's saved to the database and both users receive a realtime update
- **Local Notifications**: Each device schedules a local notification for the alarm time
- **Background Alarms**: Alarms will ring even when the app is closed (native capability)
- **Daily Repeat**: Alarms automatically repeat every day at the set time

## Important Notes

- On first launch, the app will request notification permissions
- Make sure to allow notifications for alarms to work
- Each device independently schedules its own notifications based on the shared alarm data
- Turning an alarm on/off or deleting it syncs across both devices

## Development Workflow

After making code changes:
1. Pull latest changes: `git pull`
2. Install any new dependencies: `npm install`
3. Rebuild: `npm run build`
4. Sync native code: `npx cap sync`
5. Run the app

## Troubleshooting

- **Alarms not ringing?** Check notification permissions in device settings
- **Changes not showing?** Make sure to run `npx cap sync` after code changes
- **Android build errors?** Make sure Android Studio is installed and updated
- **iOS build errors?** Make sure you're on a Mac with Xcode installed
