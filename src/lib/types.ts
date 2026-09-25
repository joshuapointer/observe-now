// Firestore document shapes — identical to the PWA's, so both apps can share one database.
import type { Code, Med, Registry } from "./codes";

export type Role = "caregiver" | "family";
export type Pronouns = { he: string; him: string; his: string; himself: string };

export type OnShift = { id: string; cid: string; name: string; since: number };

export type Patient = {
  id: string;
  name?: string;
  careSetting?: string;
  pronouns?: Pronouns;
  meds?: Med[];
  onCallPhone?: string;
  ownerUid?: string;
  onShift?: OnShift | null;
  codes?: Code[];
  createdAt?: number;
};

export type Member = {
  id: string;
  role: Role;
  name: string;
  relation?: string;
  detail?: string;
  digestOnly?: boolean;
  owner?: boolean;
};

export type Caregiver = { id: string; name: string; pin?: string; createdAt?: number };
export type Presence = { id: string; name?: string; role?: Role; lastSeen?: number };
export type Link = { id: string; name: string; role: Role; at?: number };
export type Invite = {
  id: string;
  role: Role;
  name: string;
  relation?: string;
  detail?: string;
  digestOnly?: boolean;
  patientName?: string;
  invitedBy?: string;
  at?: number;
};

// `by` is the signed-in (shared device) account; byName/cid/shiftId say which caregiver was on shift.
export type Entry = {
  id: string; // HHMM of the box
  sid: string; // the day it belongs to (added client-side)
  slot: number;
  slotStart: number;
  codes?: string[];
  code?: string; // entries from before multi-code boxes
  place?: string;
  pain?: string;
  note?: string;
  markedAt: number;
  by?: string;
  byName?: string;
  cid?: string;
  shiftId?: string;
  med?: boolean;
  editedAt?: number;
  editedBy?: string;
};

export type Fall = {
  at: number;
  slotKey: string;
  alertId: string;
  answers?: Record<string, string | null>;
  narrative?: string;
  filedAt?: number | null;
};

export type Day = {
  id: string;
  sid?: string;
  date?: string;
  start?: number;
  meds?: Record<string, number | string | null>;
  createdAt?: number;
  startedAt?: number;
  fall?: Fall;
};

// Messages both ways. The collection is still called familyNotes (the name predates replies).
export type Message = {
  id: string;
  sid: string;
  who: string;
  role: Role;
  uid: string;
  text: string;
  at: number;
  parentId?: string;
  relation?: string;
  cid?: string;
};

export type AlertDoc = {
  id: string;
  sid: string;
  kind: "fall" | "physical" | "pain" | "fall-note";
  code: string;
  text: string;
  at: number;
  entryKey?: string;
  acks?: Record<string, { at: number; name: string }>;
};

export type PrivateNote = { id: string; note: string; at: number; byName?: string };

export type DayData = {
  day: Day | null;
  entries: Entry[];
  priv: PrivateNote[];
  notes: Message[];
  alerts: AlertDoc[];
  loaded: boolean;
};

// Text context: who the log is about, who's caring, and the patient's code list.
export type Ctx = { name: string; caregiver: string; pronouns: Pronouns; reg: Registry };
