# Firebase config per app

Download each file from the Firebase console (Project settings → Your apps → the iOS/Android app with that
bundle id) and put it here. `app.config.ts` picks the folder from `EXPO_PUBLIC_APP_ENV`.

| Folder | Firebase project | iOS bundle id / Android package |
| --- | --- | --- |
| `dev/` | `garth-log-dev` | `com.joshpointer.observenow.dev` |
| `beta/` | `garth-log-dev` | `com.joshpointer.observenow.beta` |
| `prod/` | `behavior-observation-2d03f` | `com.joshpointer.observenow` |

Each folder holds `GoogleService-Info.plist` (iOS) and, once Android is set up, `google-services.json`. They
identify the app to Firebase and aren't secrets (the same kind of values any Firebase web app serves publicly), so they
are committed: EAS builds read them from the repo.
