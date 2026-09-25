// Settings menu, ported from the PWA's menu() (views.js ~131-153). Used both as the caregiver "Settings"
// tab and as the family "/family-settings" route — rows are role-aware.
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { DEMO } from "@/lib/config";
import { activeCodes } from "@/lib/codes";
import * as M from "@/lib/model";
import {
  editMeds, endShift, openModal, openPicker, setSetting, setViewAs, signOut, startAddPatient,
} from "@/state/actions";
import { actingAs, useApp } from "@/state/app";
import { useView } from "@/state/view";
import { useLayout } from "@/ui/layout";
import { Card, ListRow, Row, Scroll, Screen, Seg, T } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <T v="eyebrow" style={{ paddingHorizontal: 4 }}>{title}</T> : null}
      <Card pad={0} style={{ overflow: "hidden" }}>{children}</Card>
    </View>
  );
}

// A row whose control is a set of segmented choices (Screen, Look, Clock) rather than a single button.
function SegListRow({ title, detail, options, value, onChange }: {
  title: string; detail?: string; options: [string, string][]; value: string; onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segRow, { borderBottomColor: t.c.line }]}>
      <View style={{ gap: 2 }}>
        <T v="label">{title}</T>
        {detail ? <T v="small">{detail}</T> : null}
      </View>
      <Row wrap gap={8}>
        {options.map(([id, label]) => (
          <Seg key={id} title={label} on={value === id} small onPress={() => onChange(id)} />
        ))}
      </Row>
    </View>
  );
}

export function SettingsScreen() {
  const { isTablet } = useLayout();
  const V = useView();
  const settings = useApp(s => s.settings);
  const reg = useApp(s => s.reg);
  const user = useApp(s => s.user);
  const member = useApp(s => s.member);
  const links = useApp(s => s.links);
  const pendingInvites = useApp(s => s.pendingInvites);

  const isFamily = useApp(s => actingAs(s)) === "family";
  // The caregiver role (the care account, or family the owner has let act as caregivers) can use either mode.
  const canCare = member?.role === "caregiver";
  // Switch lists the people you can open in the current mode: in family mode, the ones you were invited to follow.
  const sameMode = (links || []).filter(l => (l.role === "family") === isFamily);
  const canSwitch = sameMode.length > 1 || !!pendingInvites?.length;

  const who = user?.email || user?.phone || "";
  const acctTitle = isFamily ? member?.name || who : "This device";
  const acctDetail = (isFamily ? "Family" : `Signed in as ${who} · stays signed in between shifts`) + (DEMO ? " · practice mode" : "");

  return (
    <Screen>
      <Scroll contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: isTablet ? 720 : undefined, alignSelf: "center", gap: 20 }}>
          <Section>
            <ListRow
              title={isFamily ? "Family member" : "Caring for"}
              detail={isFamily ? `Following ${V.ctx.name}` : V.ctx.name}
              right={canSwitch ? <Seg title="Switch" small onPress={() => openPicker(isFamily ? "family" : "care")} /> : undefined}
            />
            {canCare ? (
              <ListRow
                title={isFamily ? "Caregiver mode" : "Family mode"}
                detail={isFamily ? `Record and look after ${V.ctx.name}` : `See ${V.ctx.name}'s day the way family do`}
                right={<Seg title="Switch" small onPress={() => setViewAs(isFamily ? "care" : "family")} />}
              />
            ) : null}
            {isFamily ? null : (
              <ListRow
                title="Look after someone else"
                detail="Add a person and be their caregiver"
                right={<Seg title="Add" small onPress={startAddPatient} />}
              />
            )}
          </Section>

          {isFamily ? null : (
            <Section title="Care & records">
              <ListRow
                title="On shift"
                detail={`${V.onShift?.name || "Nobody"}${V.onShift ? " · since " + M.hhmm(V.onShift.since) : ""}`}
                right={<Seg title="End shift" small onPress={endShift} />}
              />
              <ListRow
                title="Medicines"
                detail={`${V.meds.length} on the list`}
                right={<Seg title="Edit" small onPress={editMeds} />}
              />
              <ListRow
                title="Codes"
                detail={`${activeCodes(reg).length} to choose from`}
                right={<Seg title="Edit" small onPress={() => router.push("/codes")} />}
              />
              <ListRow
                title="Caregivers"
                detail={`${V.roster.length} can start a shift here`}
                right={<Seg title="Edit" small onPress={() => openModal("caregivers")} />}
              />
              <ListRow
                title="Family"
                detail={`${V.family.length} following along`}
                right={<Seg title={V.isOwner ? "Invite" : "See"} small onPress={() => openModal("people")} />}
              />
              <ListRow
                title="Details"
                detail="Name and on-call number"
                right={<Seg title="Edit" small onPress={() => openModal("details")} />}
              />
            </Section>
          )}

          <Section title="Appearance">
            <SegListRow
              title="Screen"
              detail="Night is easier on the eyes in the dark"
              options={[["auto", "Auto"], ["light", "Light"], ["night", "Night"]]}
              value={settings.theme}
              onChange={v => setSetting("theme", v as typeof settings.theme)}
            />
            <SegListRow
              title="Look"
              detail="Colorful is rounder and brighter"
              options={[["colorful", "Colorful"], ["classic", "Classic"]]}
              value={settings.style}
              onChange={v => setSetting("style", v as typeof settings.style)}
            />
            <SegListRow
              title="Clock"
              detail={M.clock.h12 ? "For example 11:30 pm" : "For example 23:30"}
              options={[["auto", "Auto"], ["12", "12-hour"], ["24", "24-hour"]]}
              value={settings.clock}
              onChange={v => setSetting("clock", v as typeof settings.clock)}
            />
            <ListRow
              title="Everyday words"
              detail={settings.plain ? "Plain sentences" : "Clinical codes"}
              right={<Seg title={settings.plain ? "On" : "Off"} on={settings.plain} small onPress={() => setSetting("plain", !settings.plain)} />}
            />
          </Section>

          {isFamily ? null : (
            <Section title="Reminders">
              <ListRow
                title="Countdown to next entry"
                right={<Seg title={settings.nudge ? "On" : "Off"} on={settings.nudge} small onPress={() => setSetting("nudge", !settings.nudge)} />}
              />
              <ListRow
                title="Keep the screen on"
                detail="While the log is open"
                right={<Seg title={settings.wake ? "On" : "Off"} on={settings.wake} small onPress={() => setSetting("wake", !settings.wake)} />}
              />
              <ListRow
                title="What family see"
                detail="A preview of their screen"
                right={<Seg title="Preview" small onPress={() => router.push("/preview")} />}
              />
            </Section>
          )}

          <Section title="Help">
            <ListRow
              title="Tour"
              detail="See the welcome again"
              right={<Seg title="Show" small onPress={() => openModal("welcome")} />}
            />
          </Section>

          <Section title="Account">
            <ListRow
              title={acctTitle}
              detail={acctDetail}
              right={<Seg title="Sign out" small onPress={signOut} />}
            />
          </Section>
        </View>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
