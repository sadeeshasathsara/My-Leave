<div align="center">
  <h1>📅 My Leave Tracker</h1>
  <p><strong>A beautiful, privacy-first personal leave management app for Android & iOS</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white" />
    <img src="https://img.shields.io/badge/React%20Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/SQLite-Offline%20First-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  </p>
</div>

---

## 📖 Overview

**My Leave Tracker** is a sleek, offline-first mobile application that helps you track and manage your personal leave records across all leave types. It works completely offline using a local SQLite database, supports Google Drive cloud backup, and generates printable PDF/Excel reports — all from your phone.

---

## ✨ Features

### 📊 Dashboard
- Summary cards showing **current month** leave counts by type (Casual, Vacation, Duty)
- Yearly summary with total days logged per category
- Quick action buttons to add leave, view calendar, or open reports
- Recent log entries with tap-to-edit support
- Pull-to-refresh support

### 🗂️ Leave Types
Three supported leave types — no quotas or limits:
- 🟠 **Casual Leave** — Short, informal absences
- 🔵 **Vacation Leave** — Planned personal holidays
- 🟢 **Duty Leave** — Official duty or assignments

### 📅 Calendar View
- Full interactive monthly calendar
- Leave days highlighted by type color
- Year navigation with a global top-bar year selector

### 📝 Record Leave (Slide-Up Modal)
- Slide-up bottom-to-top modal form triggered from the FAB center tab
- Built-in inline **month calendar picker** for selecting leave dates
- Duplicate date protection — blocks recording a second leave on the same day
- Validation with friendly custom toast notifications
- Tap any entry to edit or delete it

### 📤 Reports & Export
- Filter report data by year using the global year selector
- Export to **PDF** (printable, shareable)
- Export to **Excel/CSV** spreadsheet
- Native **print dialog** integration

### ☁️ Google Drive Backup
- Sign in with Google to enable cloud sync
- Backup and restore all leave records and settings to/from Google Drive
- Offline JSON file backup/restore as a fallback
- Simulation mode for testing on Expo Go

### 🔔 Daily Push Notifications
- Asks **"Did you take a leave today?"** every day at **9:00 AM**
- If ignored, sends a reminder at **9:00 PM**
- Responds to **Yes** by opening the leave logger directly
- **No** response cancels the evening reminder until tomorrow
- Backed by `expo-notifications` with interactive action buttons

### 🎨 Design & UX
- Dark / Light / System theme support
- Premium UI with smooth micro-animations
- Global year dropdown in every screen header
- Custom auto-dismissing toast notifications (no OK/Cancel popups)
- Floating Action Button (FAB) for the main Record action
- Keyboard-aware form with scroll avoidance

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo SDK 54](https://expo.dev) + [Expo Router v6](https://expo.github.io/router/) |
| Language | TypeScript |
| UI | React Native (Vanilla CSS-in-JS) |
| State Management | [Zustand](https://github.com/pmndrs/zustand) |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (offline-first) |
| Notifications | [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Export | [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) + [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) |
| Google Auth | [@react-native-google-signin/google-signin](https://github.com/react-native-google-signin/google-signin) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go app on your Android or iOS device (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/my-leave.git
cd my-leave

# Install dependencies
npm install

# Start the development server
npx expo start --lan --clear
```

Scan the QR code with the Expo Go app on your phone.

---

## 🏗️ Build APK

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for production builds.

```bash
# Log in to your Expo account
npx eas login

# Build a preview APK (direct install, no Play Store required)
npx eas build --profile preview --platform android

# Build a production AAB (for Google Play Store)
npx eas build --profile production --platform android
```

The build runs in Expo's cloud. Once complete, you'll receive a download link for the `.apk` file.

---

## 📁 Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout, tabs, modal, notifications
│   ├── index.tsx           # Dashboard home screen
│   ├── add.tsx             # Add/Edit leave form (modal)
│   ├── calendar.tsx        # Calendar screen
│   ├── reports.tsx         # Reports & export screen
│   └── settings.tsx        # Settings screen
│
├── components/
│   ├── toast.tsx           # Global animated toast notification
│   ├── onboarding.tsx      # First-launch onboarding flow
│   └── animated-icon.tsx   # Splash screen overlay
│
├── services/
│   ├── database.ts         # SQLite database layer
│   ├── notifications.ts    # Push notification scheduling & handlers
│   ├── backup.ts           # Google Drive & local backup/restore
│   └── export.ts           # PDF & Excel export
│
├── storage/
│   └── store.ts            # Zustand global state store
│
├── constants/
│   ├── theme.ts            # Colors, spacing, border radius tokens
│   └── layout.ts           # Screen dimensions, responsive font scale
│
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://sadeeshasathsara.me"><strong>Sadeesha Sathsara Kumbukage</strong></a></p>
  <p>
    <a href="mailto:sathsarakumbukage@gmail.com">sathsarakumbukage@gmail.com</a>
  </p>
</div>
