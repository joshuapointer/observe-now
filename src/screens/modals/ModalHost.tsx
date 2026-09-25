// Renders the modal named by useApp().modal, ported from the PWA's modal()/helpFor()/welcomeFor()/peopleBody()
// (views.js ~568-675, ~281-298).
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_NAME } from "@/lib/config";
import { PLACES, PAINS, type Med } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Caregiver, Ctx, Entry, Member, OnShift, Patient } from "@/lib/types";
import {
  cgEdit, cgNew, cgRemove, closeModal, editField, editUncode, invite, LOCKED_CODES, medCancel, medEdit,
  medField, medNew, medRemove, medSave, medToggleNeeded, saveDetails, saveEdit, setCanCare,
} from "@/state/actions";
import { actingAs, useApp, type CgForm, type EditForm, type MedForm, type ModalId } from "@/state/app";
import { notAsked, useView, type View as ComputedView } from "@/state/view";
import { CaregiverForm } from "@/screens/gate/CaregiverForm";
import { useLayout } from "@/ui/layout";
import { Bar, Button, Chip, Field, KeyboardArea, Row, Rule, Scroll, Seg, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

// ---------------------------------------------------------------- help / welcome copy
// Small parts arrays instead of parsed HTML: a plain string, or `b()`/`it()` for the PWA's <b>/<i> emphasis.
type Part = string | { b: string } | { i: string };
const b = (text: string): Part => ({ b: text });
const it = (text: string): Part => ({ i: text });

const HELP_ROUTE: Record<string, string> = {
  "/record": "log", "/messages": "messages", "/notes": "notes", "/week": "trends",
  "/fall": "fall", "/codes": "codes", "/preview": "family",
};

function helpFor(pathname: string, isFamily: boolean, V: ComputedView): [string, Part[][]] {
  const n = V.ctx.name, c = V.ctx.caregiver;
  if (isFamily) {
    return ["Using this page", [
      [`The big box at the top shows what ${n} is doing right now. ${c} updates it through the day.`],
      ["A red box is an important alert. Tap ", b("Got it"), " once you've read it."],
      ["Tap any line in the list to see the exact clinical code."],
      [`Type in the box at the bottom to send ${c} a message. They'll see it in the care app, on whichever phone or tablet it's open on.`],
      ["Messages appear in the list with everything else, with replies underneath. Tap ", b("Reply"), " to answer one."],
    ]];
  }
  const map: Record<string, [string, Part[][]]> = {
    log: ["Recording what's happening", [
      [b("Step 1."), " Tap a group (for example ", it("Sleep and waking"), `) to open it, then tap every square that matches what ${n} is doing — you can choose from more than one group.`],
      [b("Step 2."), " Add details if you like (where, pain, a note), then press ", b("Save"), "."],
      ["Family see your entry straight away, in everyday words."],
      ["Boxes at the top are 15-minute gaps, covering the whole day. A red outline means one was left empty — tap it to fill it in. Tap a box that already has a code to add another."],
      ["Made a mistake? Press ", b("Undo"), " in the message that appears after saving."],
      ["The ", b("Messages"), " tab is where you write to family and answer them. A number on it means family have written something you haven't read yet."],
      ["To change or remove something you recorded this shift, tap ", b("Edit"), " next to it under ", b("What's been recorded"), ", or tap its box."],
      ["Finishing? Tap ", b("End shift"), " at the top so the next caregiver can start theirs."],
    ]],
    fall: ["Fall report", [
      ["This page opens when you tap ", b("A fall"), " on the Record screen. Family have already been told."],
      ["Answer each question by tapping. Tap again to un-choose."],
      ["Write what happened in your own words. It saves as you type."],
      ["Press ", b("Send fall report to family"), " when you're done, then ", b("Back to Record"), "."],
      ["If you leave before sending it, Record shows a red button to come back and finish it."],
    ]],
    notes: ["Notes and medicines", [
      ["Press ", b("Give now"), " when you give a medicine. It's added to the log automatically."],
      ["Tap a phrase or type your own note."],
      [b("Save note (family can see it)"), " shares it in the family list. The other button keeps it private to caregivers."],
    ]],
    trends: ["The last seven nights", [
      ["Each row is one night, from evening to morning."],
      ["Darker squares mean more restless. Red is a fall."],
      ["The sentences underneath point out patterns worth mentioning to the nurse or doctor."],
    ]],
    messages: ["Messages with family", [
      ["Conversations are listed on the left, newest first. A red dot means family wrote something you haven't read."],
      ["Tap a conversation to open it, then write in the box at the bottom to reply."],
      ["Tap ", b("New message"), " to start a new conversation with family."],
      ["Family see your messages in their list of updates, with replies underneath, and can answer from there."],
    ]],
    family: ["What family see", [
      ["This is exactly what family see on their phones."],
      ["You can't send messages from here — it's a preview."],
    ]],
    codes: ["Codes you can choose", [
      ["These are the squares on the Record screen. Changes show up straight away, on this device and on family's phones."],
      ["The ", b("short description"), " is what family read. The ", b("long description"), " shows when Everyday words is off."],
      ["The ", b("abbreviation"), " (up to 4 letters) goes in the boxes at the top. Leave it empty and the boxes show the short description."],
      ["Removing a code only stops it being offered. Past entries keep it, and you can put it back."],
    ]],
  };
  return map[HELP_ROUTE[pathname] ?? ""] || ["Help", [["Tap the tabs at the top to move around."]]];
}

function welcomeFor(isFamily: boolean, V: ComputedView): Part[][] {
  const n = V.ctx.name, c = V.ctx.caregiver;
  if (isFamily) {
    return [
      [`You'll see what ${n} is doing, kept up to date by ${c}.`],
      ["A red box means something important has happened."],
      ["You can send a message back at the bottom of the screen."],
      ["Tap ", b("Help"), " at the top any time."],
    ];
  }
  return [
    [`Every 15 minutes, tap what ${n} is doing — tap more than one if several things are true at once.`],
    ["Family see it on their phones, in plain words."],
    [`If ${n} falls, tap `, b("A fall"), " — family are alerted at once."],
    ["Write to family, and read their messages, in the ", b("Messages"), " tab."],
    ["When you finish, tap ", b("End shift"), " at the top. The next caregiver picks their name to start theirs."],
    ["Tap ", b("Help"), " at the top any time."],
  ];
}

function Line({ parts }: { parts: Part[] }) {
  const t = useTheme();
  return (
    <T v="body" style={{ flex: 1 }}>
      {parts.map((p, idx) => {
        if (typeof p === "string") return <Text key={idx}>{p}</Text>;
        if ("b" in p) return <Text key={idx} style={t.font("heavy")}>{p.b}</Text>;
        return <Text key={idx} style={{ fontStyle: "italic" }}>{p.i}</Text>;
      })}
    </T>
  );
}

function Steps({ items }: { items: Part[][] }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((parts, idx) => (
        <Row key={idx} gap={10} center={false}>
          <T v="body" weight="black">{`${idx + 1}.`}</T>
          <Line parts={parts} />
        </Row>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- chrome shared by every sheet
function ModalBar({ title }: { title: string }) {
  const t = useTheme();
  return (
    <Bar
      title={title}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeModal} hitSlop={8}>
          <Ionicons name="close" size={22} color={t.colorful ? t.c.ink : t.c.onChrome} />
        </Pressable>
      }
    />
  );
}

function ModalBody({ children }: { children: ReactNode }) {
  return (
    <KeyboardArea style={{ flex: 1 }}>
      <Scroll contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {children}
      </Scroll>
    </KeyboardArea>
  );
}

// ---------------------------------------------------------------- medicines
function MedsBody({ medForm, meds }: { medForm: MedForm | null; meds: Med[] }) {
  const t = useTheme();
  if (medForm) {
    return (
      <View style={{ gap: 14 }}>
        <T v="eyebrow">{medForm.idx >= 0 ? "Change this medicine" : "Add a medicine"}</T>
        <Field label="Medicine name" value={medForm.name} onChangeText={v => medField("name", v)} autoComplete="off" autoCorrect={false} />
        <Field label="Dose (for example 3 mg)" value={medForm.dose} onChangeText={v => medField("dose", v)} autoComplete="off" autoCorrect={false} />
        <Field label={'When it’s given (for example “with breakfast”)'} value={medForm.sched} onChangeText={v => medField("sched", v)} autoComplete="off" autoCorrect={false} />
        <View style={{ gap: 6 }}>
          <T v="label">Only when needed?</T>
          <Row><Seg title={medForm.asNeeded ? "Yes — only when needed" : "No — given on a schedule"} on={medForm.asNeeded} onPress={medToggleNeeded} /></Row>
        </View>
        {medForm.asNeeded ? null : (
          <Field
            label="Time it's due (optional)"
            value={medForm.dueAt}
            onChangeText={v => medField("dueAt", v)}
            keyboardType="number-pad"
            placeholder="HH:MM"
            hint="After this time it will show “Due now” until it's given."
          />
        )}
        <Row wrap gap={10}>
          <Button kind="primary" big title="Save medicine" onPress={medSave} />
          <Button big title="Cancel" onPress={medCancel} />
        </Row>
      </View>
    );
  }
  return (
    <View>
      {meds.length ? meds.map((m, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.c.line }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label">{m.name}</T>
            <T v="small">{[m.dose, m.sched].filter(Boolean).join(" · ") + (m.asNeeded ? " · only when needed" : "")}</T>
          </View>
          <Row gap={8}>
            <Seg title="Change" small onPress={() => medEdit(i)} />
            <Seg title="Remove" small onPress={() => medRemove(i)} />
          </Row>
        </View>
      )) : <T v="small">No medicines yet.</T>}
      <Row wrap gap={10} style={{ paddingTop: 12 }}>
        <Button kind="primary" big title="Add a medicine" onPress={medNew} />
        <Button big title="Done" onPress={closeModal} />
      </Row>
    </View>
  );
}

// ---------------------------------------------------------------- details
function DetailsBody({ patient }: { patient: Patient | null | undefined }) {
  const [name, setName] = useState(patient?.name || "");
  const [careSetting, setCareSetting] = useState(patient?.careSetting || "");
  const [onCallPhone, setOnCallPhone] = useState(patient?.onCallPhone || "");
  return (
    <View style={{ gap: 14 }}>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="off" autoCorrect={false} />
      <Field label={'Care setting (for example “Home, 24-hour care”)'} value={careSetting} onChangeText={setCareSetting} autoComplete="off" autoCorrect={false} />
      <Field
        label="On-call nurse's phone number (adds a Call button to the fall report)"
        value={onCallPhone}
        onChangeText={setOnCallPhone}
        keyboardType="phone-pad"
        autoComplete="off"
      />
      <Row wrap gap={10}>
        <Button kind="primary" big title="Save" onPress={() => saveDetails({ name, careSetting, onCallPhone })} />
        <Button big title="Cancel" onPress={closeModal} />
      </Row>
    </View>
  );
}

// ---------------------------------------------------------------- caregivers
function CaregiversBody({ cgForm, roster, onShift }: { cgForm: CgForm | null; roster: Caregiver[]; onShift: OnShift | null }) {
  const t = useTheme();
  if (cgForm) return <CaregiverForm key={cgForm.id ?? "new"} form={cgForm} cancellable />;
  return (
    <View>
      {roster.length ? roster.map(c => (
        <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.c.line }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label">{c.name}</T>
            <T v="small">{onShift?.cid === c.id ? "On shift now" : "Can start a shift"}</T>
          </View>
          <Row gap={8}>
            <Seg title="Change" small onPress={() => cgEdit(c.id)} />
            <Seg title="Remove" small onPress={() => cgRemove(c.id)} />
          </Row>
        </View>
      )) : <T v="small">No caregivers yet.</T>}
      <Row wrap gap={10} style={{ paddingTop: 12 }}>
        <Button kind="primary" big title="Add a caregiver" onPress={cgNew} />
        <Button big title="Done" onPress={closeModal} />
      </Row>
    </View>
  );
}

// ---------------------------------------------------------------- family (people)
function PeopleBody({ family, live, isOwner }: { family: Member[]; live: Member[]; isOwner: boolean }) {
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <View style={{ gap: 16 }}>
      <View>
        {family.length ? family.map(m => {
          const on = live.some(x => x.id === m.id);
          return (
            <View key={m.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.c.line, gap: 2 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T v="label">{m.name}{m.relation ? ` · ${m.relation}` : ""}</T>
                <T v="small" color={on ? t.c.live : undefined}>{on ? "Watching now" : "Not online"}</T>
              </Row>
              {m.detail ? <T v="small">{m.detail}</T> : null}
              {isOwner ? (
                <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
                  <T v="small" style={{ flex: 1 }}>
                    {m.role === "caregiver" ? "Can also act as a caregiver" : "Family only"}
                  </T>
                  <Seg
                    small
                    title={m.role === "caregiver" ? "Stop" : "Let them care"}
                    accessibilityLabel={m.role === "caregiver" ? `Stop ${m.name} acting as a caregiver` : `Let ${m.name} also act as a caregiver`}
                    onPress={() => setCanCare(m.id, m.role !== "caregiver")}
                  />
                </Row>
              ) : null}
            </View>
          );
        }) : <T v="small">No family on this log yet.</T>}
      </View>
      <T v="small">Family read plain sentences, not codes (they can tap a line to see the code). A red alert is sent straight away for a fall, grabbing or pushing, or pain of 7 or more.</T>
      {isOwner ? (
        <View style={{ gap: 10 }}>
          <Rule />
          <T v="eyebrow">Invite a family member</T>
          <Field placeholder="Their email address or mobile number" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="off" autoCorrect={false} />
          <Field placeholder="Their name" value={name} onChangeText={setName} autoComplete="off" />
          <Field placeholder="How they're related (daughter, son…)" value={relation} onChangeText={setRelation} autoComplete="off" />
          <Field placeholder="Anything useful (for example: lives overseas)" value={detail} onChangeText={setDetail} autoComplete="off" />
          <Button
            kind="primary"
            big
            title="Send invitation"
            onPress={() => { if (invite({ contact: email, name, relation, detail })) { setEmail(""); setName(""); setRelation(""); setDetail(""); } }}
          />
          <T v="small">{"They sign in on their own phone or tablet with this email address or mobile number and are let in automatically. Caregivers don't need an invitation: add them under Settings → Caregivers."}</T>
        </View>
      ) : null}
      <Button big title="Done" onPress={closeModal} />
    </View>
  );
}

// ---------------------------------------------------------------- edit entry
function EditEntryBody({ edit, entry, ctx, plain }: { edit: EditForm; entry: Entry; ctx: Ctx; plain: boolean }) {
  const locked = (c: string) => LOCKED_CODES.includes(c);
  const hasLocked = M.entryCodes(entry).some(locked);
  const removableNote = edit.codes.some(c => !locked(c));
  const showMedChip = edit.med && !edit.codes.includes("MD");
  return (
    <>
      <View style={{ gap: 8 }}>
        <T v="label">{`What was recorded${removableNote ? " — tap × to remove" : ""}`}</T>
        <Row wrap gap={8}>
          {edit.codes.map(c => locked(c) ? (
            <Chip key={c} title={`${plain ? M.codeText(c, ctx) : M.codeLabel(c, ctx)} · alert sent`} />
          ) : (
            <Chip key={c} title={plain ? M.codeText(c, ctx) : M.codeLabel(c, ctx)} onRemove={() => editUncode(c)} />
          ))}
          {showMedChip ? <Chip title="Medicine given" onRemove={() => editUncode("MD")} /> : null}
          {!edit.codes.length && !showMedChip ? <T v="small">Nothing left but the note.</T> : null}
        </Row>
        <T v="small">To add something, close this, tap the box, then tap the square.</T>
      </View>
      <View style={{ gap: 8 }}>
        <T v="label">{`Where was ${ctx.name}?`}</T>
        <Row wrap gap={8}>
          {PLACES.map(o => <Seg key={o} title={o} on={edit.place === o} onPress={() => editField("place", o)} />)}
        </Row>
      </View>
      <View style={{ gap: 8 }}>
        <T v="label">Pain level</T>
        <Row wrap gap={8}>
          {PAINS.map(o => <Seg key={o} title={notAsked(o)} wide={o === "—"} on={edit.pain === o} onPress={() => editField("pain", o)} />)}
        </Row>
      </View>
      <Field label="Note" value={edit.note} onChangeText={v => editField("note", v)} autoComplete="off" />
      {hasLocked ? <T v="small">This entry sent a red alert to family, so the alert and the entry itself stay on the record.</T> : null}
      <Row wrap gap={10}>
        <Button kind="primary" big title="Save changes" onPress={() => saveEdit(false)} />
        <Button kind="danger" big title="Delete entry" disabled={hasLocked} onPress={() => saveEdit(true)} />
        <Button big title="Cancel" onPress={closeModal} />
      </Row>
    </>
  );
}

// ---------------------------------------------------------------- host
function ModalContent({ modal }: { modal: NonNullable<ModalId> }) {
  const V = useView();
  const pathname = usePathname();
  const medForm = useApp(s => s.medForm);
  const cgForm = useApp(s => s.cgForm);
  const patient = useApp(s => s.patient);
  const edit = useApp(s => s.edit);
  const data = useApp(s => s.data);
  const isFamily = useApp(s => actingAs(s)) === "family";
  const editEntry = edit ? data[edit.sid]?.entries.find(e => e.id === edit.id) || null : null;

  // Guards against the entry an open edit modal points at disappearing from under it (e.g. removed elsewhere).
  useEffect(() => {
    if (modal === "edit-entry" && edit && !editEntry) closeModal();
  }, [modal, edit, editEntry]);

  if (modal === "help" || modal === "welcome") {
    const [title, items] = modal === "welcome" ? [`Welcome to ${APP_NAME}`, welcomeFor(isFamily, V)] : helpFor(pathname, isFamily, V);
    return (
      <>
        <ModalBar title={title} />
        <ModalBody>
          <Steps items={items} />
          <Button kind="primary" big title="Got it" onPress={closeModal} />
        </ModalBody>
      </>
    );
  }
  if (modal === "meds") {
    return (
      <>
        <ModalBar title={`Medicines for ${V.ctx.name}`} />
        <ModalBody><MedsBody medForm={medForm} meds={V.meds} /></ModalBody>
      </>
    );
  }
  if (modal === "details") {
    return (
      <>
        <ModalBar title="Details" />
        <ModalBody><DetailsBody patient={patient} /></ModalBody>
      </>
    );
  }
  if (modal === "caregivers") {
    return (
      <>
        <ModalBar title={`Caregivers for ${V.ctx.name}`} />
        <ModalBody><CaregiversBody cgForm={cgForm} roster={V.roster} onShift={V.onShift} /></ModalBody>
      </>
    );
  }
  if (modal === "people") {
    return (
      <>
        <ModalBar title="Family" />
        <ModalBody><PeopleBody family={V.family} live={V.live} isOwner={V.isOwner} /></ModalBody>
      </>
    );
  }
  if (modal === "edit-entry") {
    if (!edit || !editEntry) return null;
    return (
      <>
        <ModalBar title={`Change the ${M.hhmm(editEntry.slotStart)} entry`} />
        <ModalBody><EditEntryBody edit={edit} entry={editEntry} ctx={V.ctx} plain={V.plain} /></ModalBody>
      </>
    );
  }
  return null;
}

export function ModalHost() {
  const modal = useApp(s => s.modal);
  const { isTablet } = useLayout();
  const t = useTheme();
  // iOS shows these as sheets below the status bar. Android draws them edge to edge, so keep the title bar and
  // the buttons clear of the status and navigation bars.
  const insets = useSafeAreaInsets();
  const edges = Platform.OS === "android" ? { paddingTop: insets.top, paddingBottom: insets.bottom } : null;

  if (!modal) return null;
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? (isTablet ? "formSheet" : "pageSheet") : undefined}
      onRequestClose={closeModal}
    >
      <View style={[{ flex: 1, backgroundColor: t.c.bg }, edges]}>
        <ModalContent modal={modal} />
      </View>
    </Modal>
  );
}
