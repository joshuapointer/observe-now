# Google Play: listing and forms

Everything Play Console asks for, ready to paste. Package: `com.joshpointer.observenow`.

## Store listing (Grow users → Store presence → Main store listing)

**App name** (30 max): Observe Now

**Short description** (80 max):
A calm, shared care log for dementia caregivers and family, every 15 minutes.

**Full description:**

Observe Now is a calm, shared record of how someone you care for is doing, built for families and caregivers looking after a person living with dementia.

Every 15 minutes, the caregiver on shift taps what's happening: asleep, restless, asking to go home, calm and occupied, in pain. One tap for the things you record most. Family see it straight away, in plain words, on their own phone.

FOR CAREGIVERS
• One shared log per person, on any phone or tablet the care team uses
• Start a shift with your name and a PIN, so every entry says who recorded it
• A clear picture of the day in 15-minute boxes, with empty ones flagged so nothing is missed
• Medicines ticked off as they're given, notes for the next caregiver or for family
• A fall report that alerts family at once, then records exactly what happened
• The last seven nights at a glance: sleep, restlessness and falls, ready to show the nurse or doctor

FOR FAMILY
• What's happening right now, in everyday words
• A red alert only when it matters: a fall, grabbing or pushing, or pain of 7 or more
• Any day's history, box by box
• Messages with the caregiver on shift

PRIVATE BY DESIGN
Only the people on a care log can see it. No ads, no tracking, nothing sold. Notes can be kept for caregivers only.

Observe Now is a record-keeping and communication tool. It is not a medical device, does not give medical advice, and is not an emergency service.

**Graphics:**
- App icon: `store/play/icon-512.png`
- Feature graphic: `store/play/feature-graphic-1024x500.png`
- Phone screenshots: `store/play/phone/` (2–8)
- 7" and 10" tablet screenshots (optional): `store/play/tablet/`

**Category:** Medical. **Tags:** Caregiving, Health. **Contact email:** privacy@joshpointer.com.
**Website:** https://observenow.joshpointer.com. **Privacy policy:** https://observenow.joshpointer.com/privacy/

## App content (Policy → App content)

- **Privacy policy:** https://observenow.joshpointer.com/privacy/
- **App access:** "All or some functionality is restricted." Instructions:
  Sign in with the mobile number +1 650 555 3434 and the code 246810 (a test number; no text is sent). A new
  account starts empty: tap "Add this person", type any first name, add a caregiver (any name and PIN, e.g. 1234),
  tap the name and type the PIN. Account deletion is in Settings → Delete my account.
- **Ads:** No, the app doesn't contain ads.
- **Content rating:** category "Reference, News, or Educational"; answer No to violence, sexuality, language,
  controlled substances, gambling; Yes to "users can interact or exchange information" (messages between family and
  caregivers on the same log); No to sharing location; No to digital purchases.
- **Target audience:** 18 and over. Not designed for children.
- **News app:** No.
- **COVID-19 contact tracing and status:** No.
- **Data safety:**
  - Collects data: Yes. Shares data with third parties: No (Firebase is a service provider, which isn't "sharing").
  - Encrypted in transit: Yes. Users can request deletion: Yes (in the app, and by email).
  - Personal info: Name (app functionality, account management); Email address (account management); Phone number
    (account management, app functionality). Collected, not shared, required for the account.
  - Health and fitness: Health info (app functionality). Collected, not shared, optional per entry.
  - Messages: Other in-app messages (app functionality). Collected, not shared.
  - App activity: Other user-generated content (notes) (app functionality). Collected, not shared.
  - Not collected: location, financial info, contacts, photos/videos, audio, files, calendar, web browsing,
    device IDs, app performance/diagnostics.
- **Health apps declaration:** Yes, the app has health features: "Medical care and treatment support: patient
  monitoring / caregiver support". It isn't a medical device and doesn't diagnose or treat.
- **Government apps:** No. **Financial features:** None.
- **Account deletion URL** (asked in Data safety): https://observenow.joshpointer.com/privacy/ (the "Your choices
  and rights" section explains in-app deletion and the email route).

## Testing (Test and release → Testing → Closed testing)

New personal developer accounts need a closed test with at least 12 testers opted in for 14 days in a row before
applying for production access. Create a track, add testers by email list (or a Google Group), upload the AAB,
and share the opt-in link. Testers must opt in and keep the app installed.

## After the first upload

- Play Console → Test and release → Setup → App integrity → App signing: copy the SHA-1 and SHA-256 of the
  **app signing key** and add them to the Firebase Android app (phone sign-in needs them).
- Service account for `eas submit -p android`: Google Cloud → IAM → Service accounts → create, add a JSON key;
  Play Console → Users and permissions → invite its email with release permissions; then
  `npx eas-cli@latest credentials -p android` → Google Service Account → upload the key.
