# MVN native app preview projects

Android and iOS Capacitor projects have been generated and synced. These are development previews, not signed applications or store submissions. The installable browser app is separate, at `/mobile-app.html` on the storefront.

## Run a preview

Requires Node 24+, Android Studio and its SDK for Android, or macOS with Xcode for iOS.

```sh
cd mobile
npm ci
npm run sync
npm run android  # Android Studio: choose a device and Run
npm run ios      # macOS/Xcode: choose your team, device and Run
```

The preview deliberately opens the existing HTTPS Render storefront on its own origin, keeping the current same-origin sessions, API checks and WhatsApp checkout. `server.url` is a development configuration, not a production architecture. It must not be submitted as-is to either store. It requires network access and does not enable payments, shipping or push notifications.

## Before a store release

- Choose the owned permanent domain and final bundle/application identifier; the `.preview` identifier is provisional.
- Replace the development remote-server configuration with a reviewed production implementation. If bundling the storefront, implement and test explicit native-origin authentication, API transport and checkout rather than weakening existing server origin protections.
- Test account/dealer flows, Android Back, external WhatsApp links, keyboard, safe areas, offline recovery and accessibility on real Android and iOS devices.
- Complete website launch gates, account recovery and account-deletion support before inviting real customers.
- Provide Google Play Console and Apple Developer accounts, signing credentials, support/privacy URLs, screenshots, store metadata and privacy disclosures. Keep signing keys out of Git.
- Build and sign release artifacts using Android Studio and Xcode; complete internal testing/TestFlight and provider review. No signed APK/AAB/IPA or store link exists yet.

Capacitor reference: https://capacitorjs.com/docs/config
