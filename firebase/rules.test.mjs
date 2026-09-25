// Security rules: who can register a patient, read invitations and join through one, for each way of signing in.
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, it } from "vitest";

// Runs inside `npm run test:rules`, which starts the Firestore emulator (needs Java; mise installs it).
const rules = readFileSync(fileURLToPath(new URL("./firestore.rules", import.meta.url)), "utf8");
const env = await initializeTestEnvironment({
  projectId: "demo-rules",
  firestore: { rules, host: "127.0.0.1", port: 8080 },
});
afterAll(() => env.cleanup());

const PHONE = "+14155550123";
const as = {
  phone: () => env.authenticatedContext("u-phone", { phone_number: PHONE, firebase: { sign_in_provider: "phone" } }).firestore(),
  otherPhone: () => env.authenticatedContext("u-phone2", { phone_number: "+14155550999", firebase: { sign_in_provider: "phone" } }).firestore(),
  apple: () => env.authenticatedContext("u-apple", { email: "abc@privaterelay.appleid.com", email_verified: true, firebase: { sign_in_provider: "apple.com" } }).firestore(),
  appleNoEmail: () => env.authenticatedContext("u-apple2", { firebase: { sign_in_provider: "apple.com" } }).firestore(),
  appleInvited: () => env.authenticatedContext("u-apple3", { email: "Ellen@Example.com", email_verified: false, firebase: { sign_in_provider: "apple.com" } }).firestore(),
  email: () => env.authenticatedContext("u-email", { email: "Ellen@Example.com", email_verified: true, firebase: { sign_in_provider: "password" } }).firestore(),
  unverified: () => env.authenticatedContext("u-unv", { email: "new@example.com", email_verified: false, firebase: { sign_in_provider: "password" } }).firestore(),
  owner: () => env.authenticatedContext("u-owner", { email: "owner@example.com", email_verified: true }).firestore(),
};

const createPatient = (db, uid, pid) => {
  const b = writeBatch(db);
  b.set(doc(db, `patients/${pid}`), { name: "P", ownerUid: uid });
  b.set(doc(db, `patients/${pid}/members/${uid}`), { role: "caregiver", name: "Care iPad" });
  return b.commit();
};

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "patients/p1"), { name: "Garth", ownerUid: "u-owner" });
    await setDoc(doc(db, "patients/p1/members/u-owner"), { role: "caregiver" });
    await setDoc(doc(db, `invitesByPhone/${PHONE}/for/p1`), { role: "family" });
    await setDoc(doc(db, "invitesByEmail/ellen@example.com/for/p1"), { role: "family" });
  });
});

describe("registering a patient", () => {
  it("phone account can", () => assertSucceeds(createPatient(as.phone(), "u-phone", "p2")));
  it("Apple account can", () => assertSucceeds(createPatient(as.apple(), "u-apple", "p3")));
  it("Apple account that shared no email can", () => assertSucceeds(createPatient(as.appleNoEmail(), "u-apple2", "p6")));
  it("verified email account can (unchanged)", () => assertSucceeds(createPatient(as.email(), "u-email", "p4")));
  it("unverified email account can't (unchanged)", () => assertFails(createPatient(as.unverified(), "u-unv", "p5")));
});

describe("phone invites", () => {
  it("invitee lists their own", () => assertSucceeds(getDocs(collection(as.phone(), `invitesByPhone/${PHONE}/for`))));
  it("someone else can't list them", () => assertFails(getDocs(collection(as.otherPhone(), `invitesByPhone/${PHONE}/for`))));
  it("an email account can't list them", () => assertFails(getDocs(collection(as.email(), `invitesByPhone/${PHONE}/for`))));
  it("owner can read and create them", async () => {
    await assertSucceeds(getDoc(doc(as.owner(), `invitesByPhone/${PHONE}/for/p1`)));
    await assertSucceeds(setDoc(doc(as.owner(), "invitesByPhone/+447700900123/for/p1"), { role: "family" }));
  });
  it("non-owner can't create them", () => assertFails(setDoc(doc(as.phone(), "invitesByPhone/+447700900123/for/p1"), { role: "family" })));
  it("invitee joins with the invited role", () => assertSucceeds(setDoc(doc(as.phone(), "patients/p1/members/u-phone"), { role: "family" })));
  it("invitee can't join as a different role", () => assertFails(setDoc(doc(as.phone(), "patients/p1/members/u-phone"), { role: "caregiver" })));
  it("uninvited phone can't join", () => assertFails(setDoc(doc(as.otherPhone(), "patients/p1/members/u-phone2"), { role: "family" })));
});

describe("email invites (regression)", () => {
  it("invitee lists their own, case-insensitively", () => assertSucceeds(getDocs(collection(as.email(), "invitesByEmail/ellen@example.com/for"))));
  it("phone account can't list email invites", () => assertFails(getDocs(collection(as.phone(), "invitesByEmail/ellen@example.com/for"))));
  it("invitee joins", () => assertSucceeds(setDoc(doc(as.email(), "patients/p1/members/u-email"), { role: "family" })));
  it("Apple account without an invite can't join", () => assertFails(setDoc(doc(as.apple(), "patients/p1/members/u-apple"), { role: "family" })));
  it("Apple account joins an invite for its email, even if Apple didn't flag it verified", async () => {
    await assertSucceeds(getDocs(collection(as.appleInvited(), "invitesByEmail/ellen@example.com/for")));
    await assertSucceeds(setDoc(doc(as.appleInvited(), "patients/p1/members/u-apple3"), { role: "family" }));
  });
  it("Apple account with no email can't read someone's email invites", () =>
    assertFails(getDocs(collection(as.appleNoEmail(), "invitesByEmail/ellen@example.com/for"))));
});

describe("letting family also act as caregivers", () => {
  beforeEach(() => env.withSecurityRulesDisabled(ctx =>
    setDoc(doc(ctx.firestore(), "patients/p1/members/u-email"), { role: "family", family: true })));
  it("the owner can grant and take it back", async () => {
    await assertSucceeds(updateDoc(doc(as.owner(), "patients/p1/members/u-email"), { role: "caregiver", family: true }));
    await assertSucceeds(updateDoc(doc(as.owner(), "patients/p1/members/u-email"), { role: "family", family: true }));
  });
  it("a family member can't grant it to themselves", () =>
    assertFails(updateDoc(doc(as.email(), "patients/p1/members/u-email"), { role: "caregiver" })));
  it("once granted, they can read caregiver-only notes; before, they can't", async () => {
    await assertFails(getDocs(collection(as.email(), "patients/p1/shifts/2026-09-25/privateNotes")));
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), "patients/p1/members/u-email"), { role: "caregiver" }));
    await assertSucceeds(getDocs(collection(as.email(), "patients/p1/shifts/2026-09-25/privateNotes")));
  });
});
