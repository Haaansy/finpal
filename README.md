# Finpal

Personal budgeting app built with **Expo (React Native)**, using **SQLite** for offline-first storage and **Expo Router** for navigation.

## Features

- **Budgeting (period-based)**
  - Remaining Funds = period income − (high-priority outflow + loan repayments)
  - Split Remaining Funds into **Safe-to-spend** + **Savings**
  - Optional: **auto-save unspent safe-to-spend** (sweep into **Savings → Future** on period close)

- **Transactions**
  - Income + expense entries with **categories**
  - Collapsible month/day groups

- **Loans**
  - Recurring loan schedules and period-accurate repayment totals
  - Local due-date reminders (configurable)

- **Savings**
  - System savings buckets: **Future**, **Emergency**, **Travel**
  - Custom **Savings Bubbles** with optional target amount and **target date**
  - Bubble reminders: **30 and 15 days** before target date
  - Deposit/withdraw/transfer between **custom** bubbles

- **Accounts**
  - Create bank accounts and edit balances
  - Link/unlink an account to:
    - a **custom savings bubble**, or
    - a **system savings bucket** (Future/Emergency/Travel)
  - Linked accounts **mirror** the linked balance (read-only while linked)
  - Transfers are only available when an account is **unlinked**

- **Notifications & permissions**
  - First-launch **Permissions** screen (notifications + import/export readiness)
  - Daily “log your entries” reminders at **9:00 AM** and **3:00 PM**
  - **System → App notifications** master toggle (requests permission and cancels scheduled reminders when Off)
  - Android: optional prompt to open **Battery optimization settings** for better reminder reliability

- **Backup / restore**
  - Export backup file: `finpal_backup-<timestamp>.finpal`
  - Import replaces local data (with confirmation)
  - Settings includes **Reset all data** (double confirmation)

## Tech stack

- **Expo SDK**: 55
- **React Native**: 0.83
- **Navigation**: Expo Router
- **Storage**: Expo SQLite
- **State**: Zustand
- **Notifications**: expo-notifications (local scheduling)

## Getting started

### Prerequisites

- Node.js (LTS recommended)
- Android Studio + an Android emulator (or a physical device)

### Install

```bash
npm install
```

### Run (development)

```bash
npm run start
```

### Run on Android

```bash
npm run android
```

### Run on iOS (macOS only)

```bash
npm run ios
```

## Notifications notes (Android)

- Local notifications can still fire when the app is closed, but delivery can be delayed by **battery optimization / Doze**.
- For best reliability on real devices: set Finpal to **“Don’t optimize”** in Android battery settings.
- After a device reboot, you may need to open the app once so it can re-sync scheduled reminders.

## Project info

- **App version**: `1.0.2` (see `app.json`)
- **Android package**: `com.haiianexe.finpal`

