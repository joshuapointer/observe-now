# Observe Now

15-minute behaviour observation, shared live with family, for **iPhone, iPad and Android** phones and tablets.
Every role works on every device: caregivers can use a phone or a tablet, and so can family.

It replaces the Garth Log PWA (`garth-observation`), which is **retired**. The app uses the same Firebase projects
and Firestore data model, so existing logs, accounts and caregiver PINs carry over. This repo is the whole
product now, backend included: the Firestore rules and indexes live in `firebase/`.

Built with Expo SDK 57, expo-router, TypeScript, React Native Firebase (the native SDKs) and zustand.

## Run it

```sh
npm install
npm run demo      # practice mode in Expo Go: local data only, never touches Firebase
npm run ios       # build + install the dev app (Observe Now Dev) on a simulator, then start Metro
npm start         # Metro for an already-installed dev app (garth-log-dev)
```

**Practice mode runs in Expo Go.** Install Expo Go on a phone/iPad on the same Wi-Fi as the Mac and scan the QR
code Metro prints (or type the `exp://<mac-ip>:8081` URL into Expo Go); saving a file reloads every connected
device. Signed in to Expo Go with the account that ran `npx expo login`, the server also shows up in its list.

**The real backend needs the dev app, not Expo Go**, because Firebase is native code Expo Go doesn't include.
Build it once per device — `npm run ios` for a simulator (needs Xcode and CocoaPods), or
`npx eas-cli@latest build -p ios --profile dev` for a registered phone/iPad — then `npm start` and open it; it
reloads like Expo Go does. Rebuild only after adding a native package or changing `app.json`/`app.config.ts`.
The dev app needs `firebase/dev/GoogleService-Info.plist` (see below). After switching environment, restart
Metro with `--clear` so the new value is inlined.

**Practice mode** has the same seed data as the PWA's demo: sign in as *the care device* or as *Ellen (family)*;
caregivers are Dana R. and Sam K., and both PINs are **1234**. A red "PRACTICE", "DEV" or "BETA" tag shows on every
screen of anything that isn't production.

### Environments

| `EXPO_PUBLIC_APP_ENV` | Backend | Run locally |
| --- | --- | --- |
| `dev` (default) | `garth-log-dev` | `npm start` (dev app) |
| `beta` | `garth-log-dev` (the TestFlight app) | TestFlight build |
| `prod` | `behavior-observation-2d03f` — real people's data | App Store build |
| `demo` | none (on-device practice store) | `npm run demo` (Expo Go) |

The same variable picks the app identity in `app.config.ts`, so each environment is its own installable app and
only "Observe Now" can reach prod:

| EAS profile | App | Bundle id | Backend | Ships via |
| --- | --- | --- | --- | --- |
| `dev` | Observe Now Dev | `com.joshpointer.observenow.dev` | `garth-log-dev` | internal (registered devices) |
| `beta` | Observe Now Beta | `com.joshpointer.observenow.beta` | `garth-log-dev` | TestFlight |
| `production` | Observe Now | `com.joshpointer.observenow` | `behavior-observation-2d03f` | App Store |

Which Firebase project a build talks to comes from the `GoogleService-Info.plist` that `app.config.ts` bundles
from `firebase/<dev|beta|prod>/` — see [`firebase/README.md`](firebase/README.md). They aren't secrets and are
committed. Dev is the default so a stray build can never write to prod.

### Signing in

Three ways, all Firebase Auth. The sign-in screen opens on the mobile number, with Sign in with Apple below it
and "Use email instead" for email and password.

- **Email and password**, with the emailed verification link (as in the PWA).
- **Sign in with Apple** (iOS): `expo-apple-authentication` → Firebase `apple.com` credential. Apple accounts
  arrive with a verified email; "Hide My Email" gives a `privaterelay.appleid.com` address, so invite those people
  by that address or by phone.
- **Mobile number + texted 6-digit code**: Firebase phone auth. New and returning people use the same two steps.
  Numbers are stored as E.164 (`+14155550123`); a 10-digit number is read as +1 on a US/Canadian device.
  On a **simulator** the dev app skips app verification, so only the console's test numbers work there (no web
  page, no real SMS); real devices and release builds always verify.

Family can be invited by email *or* mobile number (`invitesByEmail/{email}` / `invitesByPhone/{+E.164}`), and
the Firestore rules treat a phone-number account as verified.

**Firebase / Apple setup each backend needs** (both projects unless noted):

1. **Blaze plan** — phone auth bills per SMS.
2. Authentication → Sign-in method: enable **Phone** and **Apple**. Add test numbers under Phone for development.
3. Project settings → add the iOS apps (`.dev` and `.beta` in `garth-log-dev`, `com.joshpointer.observenow` in
   prod) and put each `GoogleService-Info.plist` in `firebase/<env>/`.
4. Upload an **APNs auth key** (Apple Developer → Keys; environment *Sandbox & Production*) under Project
   settings → Cloud Messaging → Apple app configuration, **once per iOS app** — each bundle id has its own slot
   (`.dev` and `.beta` in `garth-log-dev`, the prod app in `behavior-observation-2d03f`). A missing one doesn't
   error: that app just always gets the reCAPTCHA page. With it, phone sign-in on a real device proves it's the real app with a silent push — no web page;
   the app carries the push entitlement and `remote-notification` background mode for this (`app.json`). If no
   push arrives, Firebase falls back to a reCAPTCHA page, which returns to the app on a `…://firebaseauth/…` link
   that `src/app/+native-intent.tsx` keeps away from the router.
5. Authentication → Settings → **SMS region policy**: allow every country your people use. New projects allow
   none, which fails even for test numbers ("SMS unable to be sent until this region enabled").
6. Deploy the rules (see *Firestore rules* below).

## Branches and releases

Code lives at `github.com/joshuapointer/observe-now`; the EAS project is
[`@joshpointer-dev/observe-now`](https://expo.dev/accounts/joshpointer-dev/projects/observe-now).

| Branch | Push does |
| --- | --- |
| `dev` | nothing — day-to-day work, test in Expo Go (practice) or the dev app |
| `beta` | builds Observe Now Beta and uploads it to **TestFlight** (`.eas/workflows/beta.yml`) |
| `main` | builds Observe Now and uploads it to **App Store Connect** (`.eas/workflows/production.yml`); it lands in TestFlight, and going live is a manual "Submit for Review" there |

```sh
git switch beta && git merge dev && git push && git switch dev   # → TestFlight
git push origin beta:main                                        # → App Store Connect (fast-forward beta onto main)
```

Every push to `beta` or `main` spends an EAS build, so batch changes on `dev` first.

### One-time EAS setup

The workflows only run once these are done. The Apple steps prompt for your Apple ID and 2FA, so run them in a
normal terminal (needs a paid Apple Developer account):

1. `npx expo login` (or `npx expo login --browser`) as `joshpointer-dev`.
2. `npx eas-cli@latest build -p ios --profile beta --auto-submit` — let EAS generate the certificate and
   provisioning profile, create the App Store Connect app, and **create an App Store Connect API key** (that key is
   what lets the workflows submit without you).
3. The same with `--profile production` (or just `npx eas-cli@latest credentials -p ios` → `production` to set up
   signing and the API key without shipping a build).
4. On expo.dev: project → **Settings → GitHub**, install the Expo GitHub app and pick `joshuapointer/observe-now`.
5. For the dev app on your own devices: `npx eas-cli@latest device:create`, then
   `npx eas-cli@latest build -p ios --profile dev` (a development build: it loads JS from Metro).

If a workflow's submit step asks for `ascAppId`, add each app's Apple ID (App Store Connect → App Information) to
the matching `submit` profile in `eas.json` as `"ios": { "ascAppId": "…" }`.

## Firestore rules

`firebase/firestore.rules` and `firebase/firestore.indexes.json` are the one copy of the backend rules. Only this
app uses them now (the PWA is retired). `.firebaserc` names the projects: `dev` is `garth-log-dev` (the dev and
beta apps), `prod` is `behavior-observation-2d03f`.

```sh
npm run test:rules          # emulator tests (Java 21 comes from mise.toml)
npm run deploy:rules dev    # by hand; or `prod`
```

`.github/workflows/firestore.yml` runs the tests on any push or pull request that touches the rules, then deploys
pushes to `beta` → `dev` and pushes to `main` → `prod`. It signs in **keylessly** (Workload Identity Federation):
GitHub's OIDC token is exchanged for a `github-rules-deploy` service account in that project, which only has
Firebase Rules Admin, Cloud Datastore Index Admin and Service Usage Consumer. Each project's pool trusts only
`joshuapointer/observe-now`, and only jobs in the matching GitHub environment, so a dev job can't touch prod. There
are no keys or secrets; the GitHub environments `dev` and `prod` just hold two variables, `WIF_PROVIDER` and
`DEPLOY_SA`. To gate prod deploys, add yourself as a required reviewer on the `prod` environment.

Use the repo's Firebase CLI (`npx firebase …`, installed as a dev dependency) rather than a global one.

## Checks

```sh
npm run typecheck
npm run lint
npm test          # model, codes, phone numbers, and PIN-hash parity with the PWA
npm run test:rules  # Firestore security rules, in the emulator
mise run check    # typecheck, lint, test
```

End-to-end, in the iOS Simulator with [Maestro](https://maestro.mobile.dev) (`mise use maestro`, needs Java):

```sh
npm run demo                                   # Metro on :8081 in practice mode
maestro test e2e/practice-flow.yaml            # iPhone: shift, record, undo, message, medicine, week,
                                               # settings, preview, fall report, then family: alert, reply
```

## App Store screenshots

`screenshots/` holds each set named by its App Store slot and size: iPhone 6.9" (1320×2868 and 1290×2796), iPhone
6.5" (1284×2778) and iPad 13" (2064×2752). They are made from practice mode with a
believable recent history (`src/lib/store/sample.ts`), no PRACTICE marker, and the app named "Observe Now":

```sh
EXPO_PUBLIC_APP_ENV=demo EXPO_PUBLIC_SCREENSHOTS=1 npx expo prebuild --platform ios
# build Release for the simulator (see e2e/screenshots.yaml for the device ids), install it, then:
xcrun simctl spawn <device> launchctl setenv TZ Asia/Tokyo   # any zone where it's late afternoon: busier data
maestro --device <device> test e2e/screenshots.yaml --test-output-dir /tmp/shots
EXPO_PUBLIC_APP_ENV=dev npx expo prebuild --platform ios      # back to the dev project afterwards
```

## How it's built

```
src/app/            routes (expo-router). Root layout gates by role and shift with Stack.Protected:
  (gate)/           sign in · verify email · who are you caring for · start a shift (PIN)
  (care)/(tabs)/    caregiver: Now · Messages · Care (medicines, notes)
  (care)/           fall report, codes editor, "What family see" preview, settings, notes, the week's trends
  (family)/(tabs)/  family: Updates · Messages · History
  (family)/         family settings
src/lib/            codes, model (ported 1:1 from the PWA), config, stores (Firebase + practice), PIN hash
src/state/          app state (zustand), session/sync (Firestore listeners), actions, view model
src/ui/             Tamagui building blocks: primitives, sheet, floating tab bar, action button, shell
tamagui.config.ts   design system: slate + indigo themes, a colour family per code category, Nunito, springs
src/screens/        the screens
```

- `src/lib/model.ts` and `src/lib/codes.ts` are straight ports of the PWA's `model.js`/`codes.js`; the only
  change is that a patient's code list is passed around as a value (`ctx.reg`) instead of a global.
- `src/state/actions.ts` holds every action from the PWA's `acts`/`forms`, with the same Firestore paths and
  fields. `src/state/session.ts` is the PWA's `sync()`.
- **Branding** comes from the icon's glass layers (`assets/brand/`, `src/ui/Brand.tsx`): the lens, the turning
  aperture ring and the swirl mark on the splash, sign-in, loading and the intro. The native splash hands over
  to an animated copy that flies the lens into place on the first screen (`src/ui/Splash.tsx`).
- **The UI is Tamagui** (v2, Reanimated driver) with Light and Night themes. Each code category has a colour
  family (`src/ui/cat.ts`): sleep blue, mood purple, care orange, calm green, danger red. Animations (the tab
  pill, sheets, the action button menu, toasts) run on the UI thread.
- **Caregivers work from Now**: the current 15-minute box (tap to record), one-tap chips for codes used lately,
  at most one alert (an unfinished fall report, or empty boxes), the day's boxes, and the last few entries. The
  + button opens Record (the record sheet), Report a fall, Give a medicine, Write a note and Message family.
  Ending a shift, switching person or mode, and Settings are in the person button in the header.
- **Tablets** (≥ 768 pt wide, iPad or Android) get two-column layouts; **phones** get one column. Both have the
  floating tab bar. Layout follows the screen, never the role.
- **Caregivers share one care account per person being cared for**, signed in on as many phones or tablets as
  they use; each caregiver starts their shift by picking their name and PIN. Who's on shift lives on the patient
  record, so every care device shows the same shift and log, and ending it on one ends it everywhere. Family sign
  in with their own accounts on their own devices.
- Shift PINs hash exactly like the PWA did (`SHA-256("garthlog-pin:{cid}:{pin}")`), so PINs set in the PWA keep
  working. There's a test for it; don't change the scheme without migrating stored PINs.

## Differences from the PWA

- Confirmations ("End Dana's shift?") are native dialogs, in the same words.
- Settings is a page reached from the header's person button, instead of a drop-down menu.
- One look (the PWA had Colorful and Classic); Light, Night or Auto remain.
- Screen stays on via `expo-keep-awake` rather than the Wake Lock API.
- No "Add to Home Screen" hint — it's an app.

## Not done / known limits

- **No push notifications**, same as the PWA: alerts and new-message toasts only show while the app is open. The
  app now uses the native Firebase SDK, so adding `@react-native-firebase/messaging` plus a Cloud Function that
  sends on new alerts/messages is the remaining work.
- **Offline**: the native Firestore SDK keeps a persistent on-disk cache, so entries made offline survive the app
  closing and are sent when the connection returns. The app still only acts on server answers for the one
  dangerous case (an offline cold start mistaking "no data" for "you've lost access").
- **Phone and Apple sign-in haven't run against a real Firebase project yet** — they need the console setup in
  *Signing in* above. The Firestore rules for them were tested in the emulator (phone, Apple, verified and
  unverified email accounts, both invite kinds).
- **No store build has been made yet** — the EAS project, profiles and workflows exist, but the one-time setup
  above hasn't been run.
- **Web** only runs practice mode now; the real backend needs the native SDK.
- **Android runs** on a Pixel 9 emulator (`emulator -avd Pixel_9 &`, then `npx expo run:android`); each
  environment's `google-services.json` is in `firebase/<env>/`. Firebase has the SHA fingerprints of the local debug
  key and the EAS beta and prod keystores (phone sign-in needs them). Still to do for Play: a developer account, the
  Play Console apps, a service account key in EAS for `eas submit -p android`, a manual first upload per app, then
  Play's app signing fingerprints added in Firebase. Only sign-in has been tried on Android so far.
- **Tested** on iPhone 17 and iPad Pro 13" simulators in practice mode (full caregiver and family flows).
