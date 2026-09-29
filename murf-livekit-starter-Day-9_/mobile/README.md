# Shiksha Android App

This folder is the **native mobile version** of the Day-9 Shiksha voice-learning project.

It uses React Native + Expo + LiveKit React Native. The existing Python LiveKit agent and the existing Next.js token endpoint are reused; the Android app does not contain LiveKit API keys or secrets.

## Important

LiveKit React Native uses native WebRTC code, so this app **does not run inside Expo Go**. Use an Expo development build or an EAS Android build. This is expected for LiveKit's React Native integration.

## Setup

1. Install Node.js LTS.
2. Open a terminal in this `mobile` folder.
3. Install dependencies:

```bash
npm install
```

4. Optional: create `.env` from `.env.example` if you want to override the token endpoint.
5. Check the project:

```bash
npx expo doctor
```

## Run on Android

For a local Android development build:

```bash
npx expo prebuild
npx expo run:android
```

You need Android Studio/Android SDK and either an emulator or a USB-debugging-enabled Android phone.

## Build an installable APK

Login to Expo/EAS first:

```bash
eas login
```

Then:

```bash
eas build --platform android --profile preview
```

The `preview` profile is configured to produce an APK. Download the build from the EAS build page and install it on your Android phone.

## How the mobile app connects to Shiksha

```text
Android App
    |
    | POST /api/token
    v
Existing Next.js token endpoint
    |
    | LiveKit participant token
    v
LiveKit Cloud
    |
    v
Shiksha / my-agent
    |
    v
Murf voice response
```

## Security

Do not put `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` in this mobile app. The existing Next.js `/api/token` endpoint creates the short-lived participant token on the server.

If the API key/secret in the original Day-9 archive were ever pushed to a public GitHub repository, rotate those LiveKit credentials before using the project as a public repository.
