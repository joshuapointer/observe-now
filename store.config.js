// The App Store listing (EAS Metadata: npm run metadata). The App Review contact number and demo login are private:
// they're read from store/review.local.json, which isn't committed (this repository is public).
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "store/review.local.json");
if (!fs.existsSync(file)) throw new Error("Missing store/review.local.json (reviewPhone, demoUsername, demoPassword). See README → App Store.");
const review = JSON.parse(fs.readFileSync(file, "utf8"));

module.exports = {
  "configVersion": 0,
  "apple": {
    "copyright": "2026 Joshua Pointer",
    "version": "1.0.0",
    "info": {
      "en-US": {
        "title": "Observe Now Live",
        "subtitle": "Care log, shared with family",
        "description": "Observe Now is a calm, shared record of how someone you care for is doing, built for families and caregivers looking after a person living with dementia.\n\nEvery 15 minutes, the caregiver on shift taps what's happening: asleep, restless, asking to go home, calm and occupied, in pain. One tap for the things you record most. Family see it straight away, in plain words, on their own phone.\n\nFOR CAREGIVERS\n• One shared log per person, on any iPhone, iPad or Android device the care team uses\n• Start a shift with your name and a PIN, so every entry says who recorded it\n• A clear picture of the day in 15-minute boxes, with empty ones flagged so nothing is missed\n• Medicines ticked off as they're given, notes for the next caregiver or for family\n• A fall report that alerts family at once, then records exactly what happened\n• The last seven nights at a glance: sleep, restlessness and falls, ready to show the nurse or doctor\n\nFOR FAMILY\n• What's happening right now, in everyday words\n• A red alert only when it matters: a fall, grabbing or pushing, or pain of 7 or more\n• Any day's history, box by box\n• Messages with the caregiver on shift\n\nPRIVATE BY DESIGN\nOnly the people on a care log can see it. No ads, no tracking, nothing sold. Notes can be kept for caregivers only.\n\nObserve Now is a record-keeping and communication tool. It is not a medical device, does not give medical advice, and is not an emergency service.",
        "keywords": [
          "dementia",
          "caregiver",
          "care log",
          "alzheimer's",
          "sundowning",
          "family",
          "elder care",
          "carer",
          "behavior",
          "journal"
        ],
        "promoText": "A calm, shared picture of your loved one's day and night, for caregivers and family.",
        "marketingUrl": "https://observenow.joshpointer.com",
        "supportUrl": "https://observenow.joshpointer.com",
        "privacyPolicyUrl": "https://observenow.joshpointer.com/privacy/",
        "releaseNotes": "The first release of Observe Now."
      }
    },
    "categories": [
      "MEDICAL",
      "HEALTH_AND_FITNESS"
    ],
    "advisory": {
      "alcoholTobaccoOrDrugUseOrReferences": "NONE",
      "contests": "NONE",
      "gambling": false,
      "gamblingSimulated": "NONE",
      "horrorOrFearThemes": "NONE",
      "matureOrSuggestiveThemes": "NONE",
      "medicalOrTreatmentInformation": "INFREQUENT_OR_MILD",
      "profanityOrCrudeHumor": "NONE",
      "sexualContentGraphicAndNudity": "NONE",
      "sexualContentOrNudity": "NONE",
      "unrestrictedWebAccess": false,
      "violenceCartoonOrFantasy": "NONE",
      "violenceRealistic": "NONE",
      "violenceRealisticProlongedGraphicOrSadistic": "NONE",
      "kidsAgeBand": null,
      "ageRatingOverride": "NONE",
      "koreaAgeRatingOverride": "NONE"
    },
    "review": {
      "firstName": "Joshua",
      "lastName": "Pointer",
      "email": "privacy@joshpointer.com",
      "phone": review.reviewPhone,
      "demoUsername": review.demoUsername,
      "demoPassword": review.demoPassword,
      "demoRequired": true,
      "notes": "Sign in with the email and password above (\"Sign in\" on the first screen).\n\nThe account starts empty. To see the app:\n1. Tap \"Add this person\" and type any first name (for example Garth).\n2. Add a caregiver: any name and a 4-digit PIN (for example 1234). Tap the name and type the PIN to start a shift.\n3. On Now, tap the big card (or + then Record), choose what the person is doing, and Save.\n4. The person button (top right) has Settings: Family (invite by email), Codes, Medicines, Subscription and Delete my account.\n\nFamily members see the log on their own phone after being invited; \"What family see\" on the Care tab shows their view.\n\nSign in with Apple is also available. Each care log has a 14-day free trial before its subscription."
    },
    "release": {
      "automaticRelease": false,
      "phasedRelease": false
    }
  }
};
