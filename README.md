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

Then press `i` for the iOS Simulator (or scan the QR code with Expo Go on a phone/iPad), `a` for an Android
emulator. `mise run demo` / `mise run start` do the same.

**Practice mode** has the same seed data as the PWA's demo: sign in as *the care iPad* or as *Ellen (family)*;
caregivers are Dana R. and Sam K., and both PINs are **1234**. A red "PRACTICE", "DEV" or "BETA" tag shows on every
screen of anything that isn't production.

### Environments

| `EXPO_PUBLIC_APP_ENV` | Backend |
| --- | --- |
| `dev` (default) | `garth-log-dev` |
| `beta` | `garth-log-dev` (the TestFlight app) |
| `prod` | `behavior-observation-2d03f` — real people's data |
| `demo` | none (on-device practice store) |

The Firebase web configs in `src/lib/config.ts` are the public web-app configs Firebase Hosting serves at
`/__/firebase/init.json`; they are not secrets. Dev is the default so a stray build can never write to prod.

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
- **Store builds** have an EAS project (`@joshpointer-dev/observe-now`) but none has been made yet. `eas.json`
  pins the backend per profile, and `app.config.ts` gives each its own app, so all three install side by side:

  | Profile | App | Bundle id | Backend | Ships via |
  | --- | --- | --- | --- | --- |
  | `dev` | Observe Now Dev | `com.joshpointer.observenow.dev` | `garth-log-dev` | internal (registered devices) |
  | `beta` | Observe Now Beta | `com.joshpointer.observenow.beta` | `garth-log-dev` | TestFlight — push to `beta` |
  | `production` | Observe Now | `com.joshpointer.observenow` | `behavior-observation-2d03f` | App Store — push to `main` |

  The pushes run `.eas/workflows/beta.yml` and `production.yml` once GitHub is linked on expo.dev. Each
  uploads to App Store Connect; releasing to the App Store stays a manual step there. By hand:
  `npx eas-cli@latest build -p ios --profile beta --auto-submit`.
- **Before a production build**, the prod Firebase web API key may be locked to the PWA's website (HTTP
  referrers). React Native sends no referrer, so give the app its own key restricted to Identity Toolkit,
  Token Service and Firestore instead of loosening the PWA's. (The dev key was checked: sign-in reaches it.)
- **Android was never run** — there's no Android SDK on the machine this was built on. Both platform bundles
  compile, and the Android-specific spots (modal insets, keyboard, edge-to-edge) were reviewed, but test the
  note field, message composer and modals on an emulator before relying on it.
- **Tested** on iPhone 17 and iPad Pro 13" simulators in practice mode (full caregiver and family flows), and
  against `garth-log-dev` for sign-in. Not tested with a real signed-in Firebase account end to end.
