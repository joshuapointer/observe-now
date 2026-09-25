// Filters links the system opens the app with, before Expo Router treats them as routes.
//
// Phone sign-in can fall back to a reCAPTCHA web page, which returns to the app on
// <scheme>://firebaseauth/link?… . That link is for Firebase (it finishes verifying the app natively); under
// the iOS scene lifecycle Expo also hands it to the router, which would show "Unmatched Route". Returning
// null tells the router to ignore it and stay where it is.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return /^[a-z][\w+.-]*:\/\/firebaseauth\//i.test(path) ? null : path;
}
