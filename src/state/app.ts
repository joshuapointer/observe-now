import { getCalendars } from "expo-localization";
import { create } from "zustand";

import { DEFAULT_REGISTRY, type Registry } from "@/lib/codes";
import { kv } from "@/lib/kv";
import * as M from "@/lib/model";
import type { SyncStatus, User } from "@/lib/store";
import type { Caregiver, DayData, Invite, Link, Member, Patient, Presence } from "@/lib/types";

export type Settings = {
  plain: boolean; // everyday words instead of clinical codes
  nudge: boolean; // countdown to the next entry
  wake: boolean; // keep the screen on (caregiver device)
  theme: "auto" | "light" | "night";
  clock: "auto" | "12" | "24";
};

export type ModalId =
  | "help" | "welcome" | "meds" | "details" | "caregivers" | "people" | "edit-entry"
  | "record" // the record sheet: what's happening, for the current box or the one being filled in
  | "compose" // family: write a message, or a reply to the thread in replyTo
  | "account" // you, this device, the shift and switching modes
  | "paywall" // subscribe to keep recording for this log
  | null;

export type MedForm = { idx: number; name: string; dose: string; sched: string; dueAt: string; asNeeded: boolean };
export type CodeForm = { id: string | null; short: string; abbr: string; long: string; section: string };
export type CgForm = { id: string | null; name: string };
export type EditForm = { sid: string; id: string; codes: string[]; med: boolean; place: string; pain: string; note: string };
export type Drafts = Partial<Record<"note" | "noteScreen" | "fallNarr" | "reply" | "newmsg" | "familyNote", string>>;
export type Trends = { loading: true } | { loading?: false; nights: M.Night[]; summary: { stats: M.TrendStat[]; insights: string[] } };

export type AppState = {
  authReady: boolean;
  user: User | null;
  authMode: "signin" | "signup";
  authMethod: "email" | "phone";
  phoneSentTo: string; // E.164 number the last text code went to; "" until one is sent
  authError: string;
  authBusy: boolean;

  pid: string | null;
  links: Link[] | undefined;
  pendingInvites: Invite[] | undefined;
  legacyChecked: boolean;
  pickerOpen: boolean;
  pickerFor: Acting | null; // the picker lists only the people you can open this way; null lists everyone
  addingPatient: boolean;
  viewAs: Acting | null; // this device's chosen mode for the open person (see actingAs); null = the default

  member: Member | null | undefined;
  patient: Patient | null | undefined;
  reg: Registry;
  members: Member[];
  presence: Presence[];
  roster: Caregiver[] | undefined;
  pinFor: string | null;
  pin: string;
  pinError: string;
  cgForm: CgForm | null;

  follow: boolean; // follow today (flip to the new day at midnight)
  sid: string; // the day being viewed
  data: Record<string, DayData>;

  // Record screen
  target: string | null; // a box other than the current one, being filled in
  pendingCodes: string[];
  place: string;
  pain: string;
  details: boolean;

  drafts: Drafts;
  medForm: MedForm | null;
  codeForm: CodeForm | null;
  edit: EditForm | null;
  modal: ModalId;
  settings: Settings;

  msgReadAt: Record<string, number>;
  threadRead: Record<string, number>;
  thread: string | null; // open conversation id, or "new"
  replyTo: string | null; // family: thread being replied to
  lastVisit: number;
  revealed: Record<string, boolean>;
  trends: Trends | null;

  billingEnforced: boolean; // config/billing.enforced: subscriptions are switched on
  toast: string;
  undo: (() => Promise<unknown>) | null;
  status: SyncStatus;
};

const DEFAULT_SETTINGS: Settings = { plain: true, nudge: true, wake: true, theme: "auto", clock: "auto" };

export const initialSession = (): Partial<AppState> => ({
  pid: null, links: undefined, pendingInvites: undefined, legacyChecked: false, pickerOpen: false, pickerFor: null, addingPatient: false, viewAs: null,
  data: {}, member: undefined, patient: undefined, roster: undefined, members: [], presence: [], reg: DEFAULT_REGISTRY,
  pinFor: null, pin: "", pinError: "", cgForm: null, edit: null, codeForm: null, medForm: null, thread: null, replyTo: null,
  pendingCodes: [], target: null, place: "", pain: "—", details: false, msgReadAt: {}, trends: null,
  modal: null,
});

export const useApp = create<AppState>(() => ({
  ...(initialSession() as AppState),
  authReady: false, user: null, authMode: "signin", authMethod: "phone", phoneSentTo: "", authError: "", authBusy: false,
  follow: true, sid: M.sidAt(Date.now()),
  drafts: {},
  settings: DEFAULT_SETTINGS,
  threadRead: {},
  lastVisit: 0,
  revealed: {},
  toast: "", undo: null, billingEnforced: false,
  status: { online: true, pending: 0, lastSync: 0 },
}));

// Called once kv has loaded: saved settings and the "last looked" time.
export function hydrateApp() {
  useApp.setState({
    settings: { ...DEFAULT_SETTINGS, ...kv.get<Partial<Settings>>("gl:settings", {}) },
    lastVisit: kv.get("gl:lastVisit", 0),
  });
}

// Role is what an account may do for a person (the security rules enforce it); mode is which side of the app it's
// using. Family members only ever get family mode. Anyone with the caregiver role can switch between the two;
// their default is family mode if they joined as family (and the owner granted caregiving), caregiver otherwise.
export type Acting = "care" | "family";
export function actingAs(S: Pick<AppState, "member" | "viewAs">): Acting | null {
  const m = S.member;
  if (!m) return null;
  if (m.role !== "caregiver") return "family";
  return S.viewAs ?? (m.family ? "family" : "care");
}

export const get = useApp.getState;
export const set = useApp.setState;

// The clock lives in its own tiny store so ticking it only re-renders what shows the time.
export const useNow = create<{ now: number }>(() => ({ now: Date.now() }));

// Display clock: Settings → Clock, where Auto follows the device. Applied whenever settings change, before
// the components that show times re-render.
const deviceUses12h = (() => { try { return getCalendars()[0]?.uses24hourClock === false; } catch { return false; } })();
const applyClock = (c: Settings["clock"]) => { M.clock.h12 = c === "12" || (c !== "24" && deviceUses12h); };
applyClock(useApp.getState().settings.clock);
useApp.subscribe((s, prev) => { if (s.settings.clock !== prev.settings.clock) applyClock(s.settings.clock); });
