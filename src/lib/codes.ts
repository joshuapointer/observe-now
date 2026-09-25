// The built-in codes, used until caregivers change the list (then it lives on patients/{id}.codes).
// [id + default abbreviation, long (clinical) description, short (plain-language) description]
// Tokens in either description: {caregiver} {his} {himself} {he} {him}
const BUILTIN: Record<string, [string, string, string][]> = {
  "Sleep / wake": [
    ["AS", "Asleep — eyes closed, not easily roused", "Sleeping"],
    ["DZ", "Drowsy / dozing — still arousable", "Dozing off"],
    ["AB", "Awake in bed — lying down, not sleeping", "Awake, lying in bed"],
    ["AW", "Awake and calm — up or sitting", "Awake and calm"],
    ["NS", "Cannot initiate sleep — restless, asking the time", "Can't get to sleep"],
    ["WK", "Night awakening — woke after being asleep", "Woke up in the night"],
  ],
  "Sundowning / mood / thinking": [
    ["SD", "Sundowning — dusk rise in confusion or fear", "Late-day confusion rising"],
    ["AX", "Anxious / fearful", "Anxious"],
    ["VA", "Verbal agitation — calling out, repeating", "Calling out, repeating {himself}"],
    ["PA", "Pacing / restless — walking, picking at clothes", "Restless, pacing"],
    ["SH", "Shadowing — following the caregiver", "Staying close to {caregiver}"],
    ["EX", "Exit-seeking / wants to go home", "Asking to go home"],
    ["PS", "Suspicious / paranoid", "Suspicious of people"],
    ["HL", "Hallucination", "Seeing something that isn't there"],
    ["DL", "Delusion", "Believing something untrue"],
    ["CN", "More confused than daytime baseline", "More confused than usual"],
  ],
  "Care / safety / body": [
    ["RC", "Resists care", "Not wanting help"],
    ["PH", "Physical agitation — grab, push, strike", "Grabbing or pushing"],
    ["UP", "Up without help", "Got up on {his} own"],
    ["US", "Unsteady / near-fall", "Unsteady on {his} feet"],
    ["FL", "Fall or found on floor", "A fall"],
    ["PN", "Pain behavior — grimace, guarding", "Looks to be in pain"],
    ["TO", "Toileting / incontinent / asking", "Bathroom"],
    ["HU", "Hungry or thirsty", "Hungry or thirsty"],
    ["EA", "Eating or drinking", "Eating or drinking"],
    ["MD", "Medicine given this interval", "Medicine given"],
  ],
  "Calm / redirect": [
    ["CA", "Calm and occupied", "Calm and occupied"],
    ["RD", "Redirected successfully", "Settled down again"],
    ["SO", "Social / pleasant", "Chatty and pleasant"],
    ["RE", "Resting quietly after an upset — not yet asleep", "Resting quietly"],
  ],
};

export type SectionId = "sleep" | "mood" | "care" | "calm";
export type Cat = SectionId | "danger";

// Groups on the Record screen. `id` doubles as the colour family for the colorful look.
export const SECTIONS: { id: SectionId; title: string; plain: string }[] = [
  { id: "sleep", title: "Sleep / wake", plain: "Sleep and waking" },
  { id: "mood", title: "Sundowning / mood / thinking", plain: "Mood and thinking" },
  { id: "care", title: "Care / safety / body", plain: "Care, safety and body" },
  { id: "calm", title: "Calm / redirect", plain: "Calm and settled" },
];
const SECTION_BY_TITLE = Object.fromEntries(SECTIONS.map(s => [s.title, s.id])) as Record<string, SectionId>;

// Entries store the id, which never changes, so rewording a code or changing its abbreviation keeps old
// entries readable. Removed codes are archived, not deleted.
export type Code = { id: string; abbr?: string; short: string; long?: string; section: SectionId; archived?: boolean };

export const BUILTIN_CODES: Code[] = Object.entries(BUILTIN).flatMap(([title, list]) =>
  list.map(([id, long, short]) => ({ id, abbr: id, short, long, section: SECTION_BY_TITLE[title] })));

// The app's own logic depends on these, so they can be reworded but not removed.
export const SYSTEM_CODES: Record<string, string> = {
  FL: "It opens the fall report and alerts family.",
  PH: "It sends family a red alert.",
  MD: "Giving a medicine records it.",
};

// A patient's code registry. Unlike the PWA's module-level registry this is a plain value, rebuilt whenever
// the patient's list changes and passed around in the view context.
export type Registry = {
  CODE: Record<string, Code>; // id -> code, including archived ones (old entries still need their text)
  CAT: Record<string, Cat>; // id -> colour family
  LIST: Code[]; // the patient's own list (or the built-ins), in order
};

export function buildRegistry(list?: Code[] | null): Registry {
  const src = Array.isArray(list) && list.length ? list : BUILTIN_CODES;
  const CODE: Record<string, Code> = {};
  // Built-ins missing from a saved list (e.g. added in a later version) are still resolvable, just not offered.
  for (const c of BUILTIN_CODES) CODE[c.id] = { ...c, archived: true };
  for (const c of src) CODE[c.id] = c;
  const CAT: Record<string, Cat> = {};
  for (const c of Object.values(CODE)) CAT[c.id] = c.section;
  CAT.FL = "danger";
  return { CODE, CAT, LIST: src };
}

export const DEFAULT_REGISTRY = buildRegistry();

export const activeCodes = (reg: Registry) => reg.LIST.filter(c => !c.archived);

// Shown on a darker tile in the grid.
export const DARK = ["FL", "PH", "US", "PN"];

// How each code reads on the seven-night strip.
export const SLEEP_CODES = ["AS", "DZ"];
export const AGITATED_CODES = ["SD", "AX", "VA", "PA", "EX", "PS", "HL", "DL", "CN", "RC", "PH", "NS", "WK"];

export const PLACES = ["Bed", "Chair", "Bathroom", "Hall", "Other"];
export const PAINS = ["—", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
export const PHRASES = ["Asked the time", "Radio helped", "Guarding shoulder", "Walked the hall", "Refused the bed", "Ate something"];

export const FALL_QUESTIONS: [string, string[]][] = [
  ["Found where", ["Beside the bed", "Bathroom", "Hall", "Chair", "Other"]],
  ["Witnessed?", ["I saw it", "Found after", "He told me"]],
  ["Head impact?", ["None seen", "Possible", "Yes"]],
  ["Weight-bearing?", ["Yes, unaided", "Yes, with my arm", "No"]],
  ["Pain now", ["—", "1", "2", "3", "4", "5", "6", "7+"]],
  ["Skin / marks", ["None", "Redness", "Bruise", "Graze", "Bleeding"]],
];

export type Med = { name: string; dose?: string; sched?: string; dueAt?: string; asNeeded?: boolean };

// Seeded onto the practice patient.
export const DEFAULT_MEDS: Med[] = [
  { name: "Melatonin", dose: "3 mg", sched: "21:00", dueAt: "21:00" },
  { name: "Trazodone", dose: "25 mg", sched: "22:00 if needed", asNeeded: true },
  { name: "Acetaminophen", dose: "650 mg", sched: "as needed, shoulder", asNeeded: true },
  { name: "Donepezil", dose: "10 mg", sched: "morning", dueAt: "08:00" },
];

export type AlertKind = "fall" | "physical" | "pain";

// FL, PH and pain 7+ break through to family as alerts.
export function alertKind(code: string, pain: string): AlertKind | null {
  if (code === "FL") return "fall";
  if (code === "PH") return "physical";
  const p = parseInt(pain, 10);
  if (!Number.isNaN(p) && p >= 7) return "pain";
  return null;
}
