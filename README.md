# Observe Now

15-minute behaviour observation, shared live with family — the Garth Log PWA
(`~/Developer/garth-observation`) rebuilt as a React Native app for **iPhone, iPad and Android phones**.

It talks to the **same Firebase projects** as the PWA, with the same Firestore data model, so the two work side
by side: the care iPad can run the app while family keep using the web version, or the other way round.
Nothing about the backend (rules, indexes, hosting) lives here — that stays in `garth-observation`.

Built with Expo SDK 57, expo-router, TypeScript, the Firebase JS SDK and zustand.

## Run it

```sh
npm install
npm run demo      # practice mode: local data only, never touches Firebase
npm start         # the dev Firebase project (garth-log-dev)
```

Then press `i` for the iOS Simulator, `a` for an Android emulator, or run it on a real phone/iPad: install
**Expo Go**, join the same Wi-Fi as the Mac, and scan the QR code Metro prints with the Camera app (or type the
`exp://<mac-ip>:8081` URL into Expo Go). Saving a file reloads every connected device. `mise run demo` /
`mise run start` do the same. Signed in to Expo Go with the account that ran `npx expo login`, the server also
shows up in Expo Go's list, no QR needed. After switching environment, restart Metro with `--clear` so the new
value is inlined.

**Practice mode** has the same seed data as the PWA's demo: sign in as *the care iPad* or as *Ellen (family)*;
caregivers are Dana R. and Sam K., and both PINs are **1234**. A red "PRACTICE", "DEV" or "BETA" tag shows on every
screen of anything that isn't production.

### Environments

| `EXPO_PUBLIC_APP_ENV` | Backend | Run locally |
| --- | --- | --- |
| `dev` (default) | `garth-log-dev` | `npm start` |
| `beta` | `garth-log-dev` (the TestFlight app) | `EXPO_PUBLIC_APP_ENV=beta npx expo start` |
| `prod` | `behavior-observation-2d03f` — real people's data | `EXPO_PUBLIC_APP_ENV=prod npx expo start` |
| `demo` | none (on-device practice store) | `npm run demo` |

The same variable picks the app identity in `app.config.ts`, so each environment is its own installable app and
only "Observe Now" can reach prod:

| EAS profile | App | Bundle id | Backend | Ships via |
| --- | --- | --- | --- | --- |
| `dev` | Observe Now Dev | `com.joshpointer.observenow.dev` | `garth-log-dev` | internal (registered devices) |
| `beta` | Observe Now Beta | `com.joshpointer.observenow.beta` | `garth-log-dev` | TestFlight |
| `production` | Observe Now | `com.joshpointer.observenow` | `behavior-observation-2d03f` | App Store |

The Firebase web configs in `src/lib/config.ts` are the public web-app configs Firebase Hosting serves at
`/__/firebase/init.json`; they are not secrets. Dev is the default so a stray build can never write to prod.

## Branches and releases

Code lives at `github.com/joshuapointer/observe-now`; the EAS project is
[`@joshpointer-dev/observe-now`](https://expo.dev/accounts/joshpointer-dev/projects/observe-now).

| Branch | Push does |
| --- | --- |
| `dev` | nothing — day-to-day work, test with Expo Go |
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
5. Optional, for `dev` builds on your own devices: `npx eas-cli@latest device:create`, then
   `npx eas-cli@latest build -p ios --profile dev`.

If a workflow's submit step asks for `ascAppId`, add each app's Apple ID (App Store Connect → App Information) to
the matching `submit` profile in `eas.json` as `"ios": { "ascAppId": "…" }`.

## Checks

```sh
npm run typecheck
npm run lint
npm test          # model, codes, and PIN-hash parity with the PWA
mise run check    # all three
```

End-to-end, in the iOS Simulator with [Maestro](https://maestro.mobile.dev) (`mise use maestro`, needs Java):

```sh
npm run demo                                   # Metro on :8081 in practice mode
maestro test e2e/practice-flow.yaml            # iPhone: shift, record, undo, message, medicine, week,
                                               # settings, preview, fall report, then family: alert, reply
```

## How it's built

```
src/app/            routes (expo-router). Root layout gates by role and shift with Stack.Protected:
  (gate)/           sign in · verify email · who are you caring for · start a shift (PIN)
  (care)/(tabs)/    caregiver: Record · Messages · Notes & medicines · This week · Settings
  (care)/           fall report, codes editor, "What family see" preview
  (family)/         family home + settings
src/lib/            codes, model (ported 1:1 from the PWA), config, stores (Firebase + practice), PIN hash
src/state/          app state (zustand), session/sync (Firestore listeners), actions, view model
src/ui/             theme (Colorful/Classic × Light/Night), layout (tablet vs phone), primitives, shell
src/screens/        the screens
```

- `src/lib/model.ts` and `src/lib/codes.ts` are straight ports of the PWA's `model.js`/`codes.js`; the only
  change is that a patient's code list is passed around as a value (`ctx.reg`) instead of a global.
- `src/state/actions.ts` holds every action from the PWA's `acts`/`forms`, with the same Firestore paths and
  fields. `src/state/session.ts` is the PWA's `sync()`.
- **iPad** (≥ 768 pt wide) gets the PWA's two-pane layouts; **phones** get one column and a bottom tab bar.
- Shift PINs hash exactly like the PWA (`SHA-256("garthlog-pin:{cid}:{pin}")`), so a PIN set in either app works
  in both. There's a test for it.

## Differences from the PWA

- Confirmations ("End Dana's shift?") are native dialogs, in the same words.
- Settings is a tab (caregivers) or a screen (family) instead of a drop-down menu.
- Screen stays on via `expo-keep-awake` rather than the Wake Lock API.
- No "Add to Home Screen" hint — it's an app.

## Not done / known limits

- **No push notifications**, same as the PWA: alerts and new-message toasts only show while the app is open.
  Native push would need Cloud Functions plus native Firebase config (`GoogleService-Info.plist` /
  `google-services.json`) and a development build.
- **Offline**: the Firebase JS SDK on React Native only has a memory cache. Entries made offline are queued and
  sent when the connection returns *as long as the app stays open*; the PWA's IndexedDB cache survived a
  restart. The app guards against the one dangerous case (an offline cold start mistaking "no cached data"
  for "you've lost access") by only acting on server answers.
- **No store build has been made yet** — the EAS project, profiles and workflows exist, but the one-time setup
  above hasn't been run.
- **Before a production build**, the prod Firebase web API key may be locked to the PWA's website (HTTP
  referrers). React Native sends no referrer, so give the app its own key restricted to Identity Toolkit,
  Token Service and Firestore instead of loosening the PWA's. (The dev key was checked: sign-in reaches it.)
- **Android was never run** — there's no Android SDK on the machine this was built on. Both platform bundles
  compile, and the Android-specific spots (modal insets, keyboard, edge-to-edge) were reviewed, but test the
  note field, message composer and modals on an emulator before relying on it.
- **Tested** on iPhone 17 and iPad Pro 13" simulators in practice mode (full caregiver and family flows), and
  against `garth-log-dev` for sign-in. Not tested with a real signed-in Firebase account end to end.
