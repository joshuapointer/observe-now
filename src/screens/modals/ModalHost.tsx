// Every sheet in the app, driven by useApp().modal. Each one stays mounted so it can slide in and out.
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { XStack, YStack } from "tamagui";

import { PLACES, PAINS, type Med } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Caregiver, Ctx, Entry, Member, OnShift, Patient } from "@/lib/types";
import {
  cgEdit, cgNew, cgRemove, closeModal, editField, editUncode, endShift, invite, LOCKED_CODES, medCancel, medEdit,
  medField, medNew, medRemove, medSave, medToggleNeeded, openPicker, saveDetails, saveEdit, sendFamilyNote, setCanCare,
  setDraft, setViewAs, startAddPatient,
} from "@/state/actions";
import { actingAs, useApp, type CgForm, type EditForm, type MedForm } from "@/state/app";
import { msgWho, notAsked, useView, type View as ComputedView } from "@/state/view";
import { CaregiverForm } from "@/screens/gate/CaregiverForm";
import { Intro } from "@/screens/intro/Intro";
import { RecordSheet } from "@/screens/record/RecordSheet";
import { ChatBubble } from "@/ui/ChatBubble";
import { ArrowLeftRight, Eye, Plus, Settings, UserRound, Users } from "@/ui/icons";
import { Button, Card, Chip, Field, ListRow, Rule, Section, Seg, T } from "@/ui/primitives";
import { Sheet } from "@/ui/Sheet";

// ---------------------------------------------------------------- help / welcome copy
const HELP_ROUTE: Record<string, string> = {
  "/record": "now", "/messages": "messages", "/care": "care", "/week": "trends",
  "/fall": "fall", "/codes": "codes", "/preview": "family", "/settings": "settings",
};

function helpFor(pathname: string, isFamily: boolean, V: ComputedView): [string, string[]] {
  const n = V.ctx.name, c = V.ctx.caregiver;
  if (isFamily) {
    return ["Using the app", [
      `The coloured card shows what ${n} is doing right now. ${c} updates it through the day.`,
      "A red card is an important alert. Tap Got it once you've read it.",
      "Tap any line to see the clinical code that was recorded.",
      `Tap Message to write to ${c}. Tap Reply under a conversation to answer it.`,
      "History shows any day, box by box. Use the arrows to change day.",
    ]];
  }
  const map: Record<string, [string, string[]]> = {
    now: ["Recording", [
      `Every 15 minutes, tap the big card (or + then Record) and choose what ${n} is doing. Choose more than one if several things are true.`,
      "The chips under the card save straight away, in one tap.",
      "Tap any box in the day's row to fill in or change an earlier time. A dashed red box was left empty.",
      "Made a mistake? Press Undo on the message that appears after saving, or tap the entry under Recorded lately.",
      "The + button has Record, Report a fall, Give a medicine, Write a note and Message family.",
      "Finishing? Tap the person button at the top, then End shift.",
    ]],
    fall: ["Fall report", [
      "Family were alerted the moment the fall was recorded.",
      "Answer each question by tapping. Tap again to un-choose.",
      "Write what happened in your own words. It saves as you type.",
      "Press Send the report to family when you're done.",
    ]],
    care: ["Care", [
      "Press Give when you give a medicine. It's added to the log.",
      "Tap a phrase or type a note, then save it for family or for caregivers only.",
    ]],
    trends: ["The last seven nights", [
      "Each row is one night, from evening to morning.",
      "Blue is asleep, green awake and calm, orange restless, red a fall.",
      "The notes underneath point out patterns worth mentioning to the nurse or doctor.",
    ]],
    messages: ["Messages", [
      "A red number means family wrote something you haven't read.",
      "Tap a conversation to open it and reply, or start a new one at the top.",
      "Family see your messages with their updates and can answer.",
    ]],
    family: ["What family see", ["This is exactly what family see. You can't send from here."]],
    codes: ["Codes", [
      "These are the choices in the record sheet. Changes show up straight away for everyone.",
      "What family read is the plain description. The abbreviation shows in the day's boxes.",
      "Removing a code only stops it being offered. Past entries keep it.",
    ]],
    settings: ["Settings", ["Add caregivers and family, change the codes and medicines, and choose how the app looks."]],
  };
  return map[HELP_ROUTE[pathname] ?? ""] || map.now;
}

function Steps({ items }: { items: string[] }) {
  return (
    <YStack gap={14}>
      {items.map((s, i) => (
        <XStack key={i} gap={12} items="flex-start">
          <YStack width={28} height={28} rounded={14} bg="$accent3" items="center" justify="center">
            <T fontSize={14} lineHeight={17} weight="black" color="$accent11">{i + 1}</T>
          </YStack>
          <T flex={1} fontSize={17} lineHeight={23}>{s}</T>
        </XStack>
      ))}
    </YStack>
  );
}

// ---------------------------------------------------------------- medicines
function MedsBody({ medForm, meds }: { medForm: MedForm | null; meds: Med[] }) {
  if (medForm) {
    return (
      <YStack gap={14}>
        <T v="h2">{medForm.idx >= 0 ? "Change this medicine" : "Add a medicine"}</T>
        <Field label="Medicine name" value={medForm.name} onChangeText={v => medField("name", v)} autoComplete="off" autoCorrect={false} />
        <Field label="Dose" placeholder="For example 3 mg" value={medForm.dose} onChangeText={v => medField("dose", v)} autoComplete="off" autoCorrect={false} />
        <Field label="When it's given" placeholder="For example with breakfast" value={medForm.sched} onChangeText={v => medField("sched", v)} autoComplete="off" autoCorrect={false} />
        <XStack gap={8}>
          <Seg title="On a schedule" on={!medForm.asNeeded} onPress={() => { if (medForm.asNeeded) medToggleNeeded(); }} />
          <Seg title="Only when needed" on={medForm.asNeeded} onPress={() => { if (!medForm.asNeeded) medToggleNeeded(); }} />
        </XStack>
        {medForm.asNeeded ? null : (
          <Field label="Time it's due (optional)" value={medForm.dueAt} onChangeText={v => medField("dueAt", v)} keyboardType="number-pad" placeholder="HH:MM" hint="After this time it shows Due now until it's given." />
        )}
        <XStack gap={10}>
          <Button kind="ghost" big title="Cancel" onPress={medCancel} />
          <Button kind="primary" big grow title="Save medicine" onPress={medSave} />
        </XStack>
      </YStack>
    );
  }
  return (
    <YStack gap={14}>
      <Card pad={0}>
        {meds.length ? meds.map((m, i) => (
          <ListRow
            key={i}
            title={m.name}
            detail={[m.dose, m.sched].filter(Boolean).join(" · ") + (m.asNeeded ? " · only when needed" : "")}
            last={i === meds.length - 1}
            right={<XStack gap={6}><Seg title="Change" small onPress={() => medEdit(i)} /><Seg title="Remove" small onPress={() => medRemove(i)} /></XStack>}
          />
        )) : <T v="small" p={16}>No medicines yet.</T>}
      </Card>
      <Button kind="primary" big icon={Plus} title="Add a medicine" onPress={medNew} />
    </YStack>
  );
}

// ---------------------------------------------------------------- details
function DetailsBody({ patient }: { patient: Patient | null | undefined }) {
  const [name, setName] = useState(patient?.name || "");
  const [careSetting, setCareSetting] = useState(patient?.careSetting || "");
  const [onCallPhone, setOnCallPhone] = useState(patient?.onCallPhone || "");
  return (
    <YStack gap={14}>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="off" autoCorrect={false} />
      <Field label="Care setting" placeholder="For example Home, 24-hour care" value={careSetting} onChangeText={setCareSetting} autoComplete="off" autoCorrect={false} />
      <Field label="On-call nurse's number" hint="Adds a Call button to the fall report." value={onCallPhone} onChangeText={setOnCallPhone} keyboardType="phone-pad" autoComplete="off" />
      <Button kind="primary" big title="Save" onPress={() => saveDetails({ name, careSetting, onCallPhone })} />
    </YStack>
  );
}

// ---------------------------------------------------------------- caregivers
function CaregiversBody({ cgForm, roster, onShift }: { cgForm: CgForm | null; roster: Caregiver[]; onShift: OnShift | null }) {
  if (cgForm) return <CaregiverForm key={cgForm.id ?? "new"} form={cgForm} cancellable />;
  return (
    <YStack gap={14}>
      <Card pad={0}>
        {roster.length ? roster.map((c, i) => (
          <ListRow
            key={c.id}
            title={c.name}
            detail={onShift?.cid === c.id ? "On shift now" : "Can start a shift"}
            last={i === roster.length - 1}
            right={<XStack gap={6}><Seg title="Change" small onPress={() => cgEdit(c.id)} /><Seg title="Remove" small onPress={() => cgRemove(c.id)} /></XStack>}
          />
        )) : <T v="small" p={16}>No caregivers yet.</T>}
      </Card>
      <Button kind="primary" big icon={Plus} title="Add a caregiver" onPress={cgNew} />
    </YStack>
  );
}

// ---------------------------------------------------------------- family (people)
function PeopleBody({ family, live, isOwner }: { family: Member[]; live: Member[]; isOwner: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <YStack gap={18}>
      <Card pad={0}>
        {family.length ? family.map((m, i) => {
          const on = live.some(x => x.id === m.id);
          const cares = m.role === "caregiver";
          return (
            <YStack key={m.id} px={16} py={12} gap={6} borderBottomWidth={i === family.length - 1 ? 0 : 1} borderBottomColor="$color4">
              <XStack justify="space-between" items="center" gap={8}>
                <T v="label" flex={1}>{m.name}{m.relation ? ` · ${m.relation}` : ""}</T>
                <T v="small" fontSize={13} weight="heavy" color={on ? "$green11" : "$color10"}>{on ? "Watching now" : "Not online"}</T>
              </XStack>
              {m.detail ? <T v="small" fontSize={13}>{m.detail}</T> : null}
              {isOwner ? (
                <XStack justify="space-between" items="center" gap={8}>
                  <T v="small" fontSize={13} flex={1}>{cares ? "Can also act as a caregiver" : "Family only"}</T>
                  <Seg
                    small
                    title={cares ? "Stop" : "Let them care"}
                    accessibilityLabel={cares ? `Stop ${m.name} acting as a caregiver` : `Let ${m.name} also act as a caregiver`}
                    onPress={() => setCanCare(m.id, !cares)}
                  />
                </XStack>
              ) : null}
            </YStack>
          );
        }) : <T v="small" p={16}>No family on this log yet.</T>}
      </Card>
      <T v="small" fontSize={13}>Family read plain sentences, not codes. A red alert goes out straight away for a fall, grabbing or pushing, or pain of 7 or more.</T>
      {isOwner ? (
        <YStack gap={10}>
          <Rule />
          <T v="h2">Invite family</T>
          <Field placeholder="Their email address or mobile number" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="off" autoCorrect={false} accessibilityLabel="Email address or mobile number" />
          <Field placeholder="Their name" value={name} onChangeText={setName} autoComplete="off" accessibilityLabel="Name" />
          <Field placeholder="How they're related (daughter, son…)" value={relation} onChangeText={setRelation} autoComplete="off" accessibilityLabel="Relation" />
          <Field placeholder="Anything useful (for example lives overseas)" value={detail} onChangeText={setDetail} autoComplete="off" accessibilityLabel="Anything useful" />
          <Button
            kind="primary"
            big
            title="Send invitation"
            onPress={() => { if (invite({ contact: email, name, relation, detail })) { setEmail(""); setName(""); setRelation(""); setDetail(""); } }}
          />
          <T v="small" fontSize={13}>{"They sign in with this email or number and are let in automatically. Caregivers don't need an invitation: add them under Caregivers."}</T>
        </YStack>
      ) : null}
    </YStack>
  );
}

// ---------------------------------------------------------------- edit entry
function EditEntryBody({ edit, entry, ctx, plain }: { edit: EditForm; entry: Entry; ctx: Ctx; plain: boolean }) {
  const locked = (c: string) => LOCKED_CODES.includes(c);
  const hasLocked = M.entryCodes(entry).some(locked);
  const showMedChip = edit.med && !edit.codes.includes("MD");
  return (
    <YStack gap={18}>
      <Section title="What was recorded">
        <XStack flexWrap="wrap" gap={8}>
          {edit.codes.map(c => locked(c) ? (
            <Chip key={c} title={`${plain ? M.codeText(c, ctx) : M.codeLabel(c, ctx)} · alert sent`} cat={ctx.reg.CAT[c] || null} />
          ) : (
            <Chip key={c} title={plain ? M.codeText(c, ctx) : M.codeLabel(c, ctx)} cat={ctx.reg.CAT[c] || null} onRemove={() => editUncode(c)} />
          ))}
          {showMedChip ? <Chip title="Medicine given" onRemove={() => editUncode("MD")} /> : null}
          {!edit.codes.length && !showMedChip ? <T v="small">Nothing left but the note.</T> : null}
        </XStack>
        <T v="small" fontSize={13}>Tap × to remove. To add something, close this and tap the box.</T>
      </Section>
      <Section title={`Where was ${ctx.name}?`}>
        <XStack flexWrap="wrap" gap={8}>{PLACES.map(o => <Seg key={o} small title={o} on={edit.place === o} onPress={() => editField("place", o)} />)}</XStack>
      </Section>
      <Section title="Pain level">
        <XStack flexWrap="wrap" gap={6}>{PAINS.map(o => <Seg key={o} small title={notAsked(o)} wide={o === "—"} on={edit.pain === o} onPress={() => editField("pain", o)} />)}</XStack>
      </Section>
      <Field label="Note" value={edit.note} onChangeText={v => editField("note", v)} autoComplete="off" />
      {hasLocked ? <T v="small" fontSize={13}>This entry sent a red alert to family, so the alert and the entry stay on the record.</T> : null}
      <XStack gap={10} flexWrap="wrap">
        <Button kind="danger" title="Delete" disabled={hasLocked} onPress={() => saveEdit(true)} />
        <Button kind="primary" big grow title="Save changes" onPress={() => saveEdit(false)} />
      </XStack>
    </YStack>
  );
}

// ---------------------------------------------------------------- family: write a message
function ComposeBody() {
  const V = useView();
  const me = useApp(s => s.user?.uid);
  const replyToId = useApp(s => s.replyTo);
  const draft = useApp(s => s.drafts.familyNote || "");
  const input = useRef<TextInput>(null);
  const th = replyToId ? V.threads.find(t => t.root.id === replyToId) : null;
  useEffect(() => { const t = setTimeout(() => input.current?.focus(), 350); return () => clearTimeout(t); }, []);
  return (
    <YStack gap={14}>
      {th ? (
        <Card gap={8} pad={12}>
          <ChatBubble text={th.root.text} mine={th.root.uid === me} who={msgWho(th.root)} when={M.hhmm(th.root.at)} />
          {th.replies.slice(-2).map(r => <ChatBubble key={r.id} text={r.text} mine={r.uid === me} who={msgWho(r)} when={M.hhmm(r.at)} />)}
        </Card>
      ) : null}
      <Field
        ref={input}
        multiline
        minHeight={120}
        value={draft}
        onChangeText={v => setDraft("familyNote", v)}
        placeholder={th ? "Write your reply…" : `Write to ${V.ctx.caregiver}…`}
        accessibilityLabel={th ? "Reply" : "Message"}
        autoCapitalize="sentences"
      />
      <Button kind="primary" big title={th ? "Send reply" : "Send"} disabled={!draft.trim()} onPress={sendFamilyNote} />
      <T v="small" fontSize={13}>{`${V.ctx.caregiver} sees it in the care app's Messages. It doesn't ring or interrupt.`}</T>
    </YStack>
  );
}

// ---------------------------------------------------------------- you, this device, the shift, modes
function AccountBody() {
  const V = useView();
  const member = useApp(s => s.member);
  const links = useApp(s => s.links) || [];
  const pendingInvites = useApp(s => s.pendingInvites);
  const isFamily = useApp(s => actingAs(s)) === "family";
  const canCare = member?.role === "caregiver";
  const sameMode = links.filter(l => (l.role === "family") === isFamily);
  const canSwitch = sameMode.length > 1 || !!pendingInvites?.length;
  const go = (path: "/settings" | "/family-settings" | "/preview") => { closeModal(); router.push(path); };

  return (
    <YStack gap={18}>
      {!isFamily && V.onShift ? (
        <Card gap={12}>
          <XStack items="center" gap={12}>
            <YStack width={48} height={48} rounded={24} bg="$accent4" items="center" justify="center">
              <T weight="black" fontSize={20} color="$accent11">{M.firstName(V.onShift.name).slice(0, 1)}</T>
            </YStack>
            <YStack flex={1}>
              <T v="h2">{V.onShift.name}</T>
              <T v="small">{`On shift since ${M.hhmm(V.onShift.since)}`}</T>
            </YStack>
          </XStack>
          <Button kind="danger" big title="End shift" onPress={() => { closeModal(); endShift(); }} />
        </Card>
      ) : null}
      <Card pad={0}>
        <ListRow
          icon={isFamily ? Eye : UserRound}
          title={isFamily ? `Following ${V.ctx.name}` : `Caring for ${V.ctx.name}`}
          detail={isFamily ? "Family member" : "Caregiver"}
          right={canSwitch ? <Seg small title="Switch" onPress={() => openPicker(isFamily ? "family" : "care")} /> : undefined}
        />
        {canCare ? (
          <ListRow
            icon={ArrowLeftRight}
            title={isFamily ? "Caregiver mode" : "Family mode"}
            detail={isFamily ? `Record and look after ${V.ctx.name}` : `See ${V.ctx.name}'s day the way family do`}
            onPress={() => { closeModal(); setViewAs(isFamily ? "care" : "family"); }}
          />
        ) : null}
        {isFamily ? null : <ListRow icon={Users} title="Look after someone else" detail="Add a person and be their caregiver" onPress={startAddPatient} />}
        <ListRow icon={Settings} title="Settings" onPress={() => go(isFamily ? "/family-settings" : "/settings")} last />
      </Card>
      <T v="small" fontSize={13} center>{isFamily ? "Sign out is in Settings." : "Signing this device out is in Settings."}</T>
    </YStack>
  );
}

// ---------------------------------------------------------------- host
// iOS won't present a sheet while another is still sliding away, so when one sheet hands over to another (record →
// edit, account → picker) the next one waits for the first to close.
function useShownModal() {
  const [shown, setShown] = useState(useApp.getState().modal);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = useApp.subscribe((s, prev) => {
      if (s.modal === prev.modal) return;
      clearTimeout(t);
      if (s.modal && prev.modal) {
        setShown(null);
        t = setTimeout(() => setShown(useApp.getState().modal), 450);
      } else setShown(s.modal);
    });
    return () => { unsub(); clearTimeout(t); };
  }, []);
  return shown;
}

export function ModalHost() {
  const modal = useShownModal();
  const V = useView();
  const pathname = usePathname();
  const medForm = useApp(s => s.medForm);
  const cgForm = useApp(s => s.cgForm);
  const patient = useApp(s => s.patient);
  const edit = useApp(s => s.edit);
  const data = useApp(s => s.data);
  const replyToId = useApp(s => s.replyTo);
  const isFamily = useApp(s => actingAs(s)) === "family";
  const editEntry = edit ? data[edit.sid]?.entries.find(e => e.id === edit.id) || null : null;

  // Guards against the entry an open edit sheet points at disappearing from under it (e.g. removed elsewhere).
  useEffect(() => {
    if (modal === "edit-entry" && edit && !editEntry) closeModal();
  }, [modal, edit, editEntry]);

  const [helpTitle, helpItems] = helpFor(pathname, isFamily, V);

  return (
    <>
      <RecordSheet open={modal === "record"} />
      <Sheet open={modal === "help"} onClose={closeModal} title={helpTitle}>
        <Steps items={helpItems} />
        <Button kind="primary" big title="Got it" onPress={closeModal} />
      </Sheet>
<Intro open={modal === "welcome"} />
      <Sheet open={modal === "meds"} onClose={closeModal} title={`Medicines for ${V.ctx.name}`}>
        <MedsBody medForm={medForm} meds={V.meds} />
      </Sheet>
      <Sheet open={modal === "details"} onClose={closeModal} title="Details">
        <DetailsBody key={patient?.name || ""} patient={patient} />
      </Sheet>
      <Sheet open={modal === "caregivers"} onClose={closeModal} title={`Caregivers for ${V.ctx.name}`}>
        <CaregiversBody cgForm={cgForm} roster={V.roster} onShift={V.onShift} />
      </Sheet>
      <Sheet open={modal === "people"} onClose={closeModal} title="Family">
        <PeopleBody family={V.family} live={V.live} isOwner={V.isOwner} />
      </Sheet>
      <Sheet open={modal === "edit-entry" && !!editEntry} onClose={closeModal} title={editEntry ? `The ${M.hhmm(editEntry.slotStart)} entry` : "Entry"}>
        {edit && editEntry ? <EditEntryBody edit={edit} entry={editEntry} ctx={V.ctx} plain={V.plain} /> : null}
      </Sheet>
      <Sheet open={modal === "compose"} onClose={closeModal} title={replyToId ? "Reply" : `Message ${V.ctx.caregiver}`}>
        <ComposeBody />
      </Sheet>
      <Sheet open={modal === "account"} onClose={closeModal} title={isFamily ? "You" : "This device"}>
        <AccountBody />
      </Sheet>
    </>
  );
}
