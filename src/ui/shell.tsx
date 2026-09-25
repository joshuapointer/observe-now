// App chrome shared by every signed-in screen: the status header, the toast, and the environment marker.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ENV } from "@/lib/config";
import * as M from "@/lib/model";
import { endShift, openModal, undo, viewToday, viewYesterday } from "@/state/actions";
import { useApp } from "@/state/app";
import { useView } from "@/state/view";
import { useLayout } from "./layout";
import { useTheme } from "./theme";

function ChromeButton({ title, onPress, icon, label }: { title?: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; label: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.chromeBtn, { backgroundColor: pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)", borderRadius: t.colorful ? 999 : 0 }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={t.c.onChrome} /> : null}
      {title ? <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[t.font("bold"), { color: t.c.onChrome, fontSize: 14 }]}>{title}</Text> : null}
    </Pressable>
  );
}

// The coloured bar at the top: who's live, sync state, shift, help.
export function StatusHeader({ right }: { right?: ReactNode }) {
  const t = useTheme(), insets = useSafeAreaInsets(), V = useView(), { isTablet } = useLayout();
  const status = useApp(s => s.status), isFamily = useApp(s => s.member?.role === "family");
  const offline = !status.online;
  const left = offline
    ? `No internet — ${isFamily ? "showing the last update" : "entries are kept on this device and will send when it's back"}`
    : isFamily
      ? `Live from ${V.ctx.caregiver}`
      : V.live.length ? `${V.live.length} family watching` : "No family watching";
  return (
    <View style={{ backgroundColor: t.c.chrome, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
      <View style={styles.statusRow}>
        <EnvBadge />
        <View style={[styles.pill, { backgroundColor: offline ? t.c.danger : "rgba(255,255,255,0.14)", borderRadius: t.colorful ? 999 : 0, flexShrink: 1 }]}>
          {offline ? null : <View style={[styles.dot, { backgroundColor: t.c.live }]} />}
          <Text maxFontSizeMultiplier={1.3} numberOfLines={isTablet ? 1 : 2} style={[t.font("bold"), { color: "#fff", fontSize: 13, flexShrink: 1 }]}>{left}</Text>
        </View>
        {isTablet ? <Text style={[t.font("bold"), { color: t.c.onChromeDim, fontSize: 13 }]}>{M.dayLong(V.now)}</Text> : null}
        {!offline && !isFamily && status.pending ? <Text style={[t.font("bold"), { color: t.c.onChromeDim, fontSize: 13 }]}>Saving…</Text> : null}
        <View style={{ flex: 1 }} />
        {right}
        <ChromeButton label="Help" icon="help-circle-outline" title={isTablet ? "Help" : undefined} onPress={() => openModal("help")} />
      </View>
    </View>
  );
}

// Caregiver tabs: status bar + a title row. On Record it also carries the day switch and the countdown.
export function CareHeader({ title, record }: { title: string; record?: boolean }) {
  const t = useTheme(), V = useView(), { isTablet } = useLayout();
  const nudge = useApp(s => s.settings.nudge);
  const { info, d } = V, left = Math.max(0, Math.ceil((info.start + (d.cur + 1) * M.SLOT_MS - V.now) / 60000));
  const due = nudge && V.isToday && d.inToday;
  const unmarked = due && !M.entryCodes(d.byKey[d.curKey]).length;
  const shiftName = M.firstName(V.onShift?.name);
  return (
    <View>
      <StatusHeader right={<ChromeButton label={`End ${V.onShift?.name || ""}'s shift`} title={isTablet ? `${shiftName} · End shift` : `${shiftName} · End`} onPress={endShift} />} />
      <View style={[styles.titleRow, { backgroundColor: t.c.ground, borderBottomColor: t.colorful ? t.c.line : t.c.edge, borderBottomWidth: t.colorful ? 1 : 2 }, !isTablet && { flexWrap: "wrap", rowGap: 4 }]}>
        {/* On phones the title gets its own line so it's never cut short; the day and countdown sit under it. */}
        {isTablet ? null : <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={[t.font("black"), { color: t.c.ink, fontSize: 22, width: "100%" }]}>{title}</Text>}
        <View style={{ flex: 1, gap: 2 }}>
          {isTablet ? <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[t.font("black"), { color: t.c.ink, fontSize: 26 }]}>{title}</Text> : null}
          <Text maxFontSizeMultiplier={1.3} style={[t.font("semibold"), { color: t.c.mute, fontSize: 14 }]}>
            <Text style={t.font("heavy")}>{V.ctx.name}</Text> · {M.dayLong(info.start)}
            {record ? (
              <Text> · <Text onPress={V.isToday ? viewYesterday : viewToday} style={[t.font("heavy"), { color: t.c.accentInk, textDecorationLine: "underline" }]}>{V.isToday ? "See yesterday" : "Back to today"}</Text></Text>
            ) : null}
          </Text>
        </View>
        {record ? (
          <>
            <Stat label="Recording" value={M.hhmm(info.start + V.targetIdx * M.SLOT_MS)} />
            <Stat label={isTablet ? "Next entry due" : "Next due"} value={due ? `in ${left} min` : "—"} color={unmarked ? t.c.dangerInk : undefined} />
          </>
        ) : null}
      </View>
      {record && !V.isToday ? (
        <View style={[styles.yesterday, { backgroundColor: t.c.chrome }]}>
          <Text style={[t.font("bold"), { color: t.c.onChrome, fontSize: 14 }]}>{`You're looking at yesterday's log, ${M.dayLong(info.start)}. Recording is switched off here.`}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text maxFontSizeMultiplier={1.2} style={[t.font("heavy"), { color: t.c.mute, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }]}>{label}</Text>
      <Text maxFontSizeMultiplier={1.2} style={[t.font("black"), { color: color || t.c.ink, fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

// Family: status bar with Settings.
export function FamilyHeader() {
  const { isTablet } = useLayout();
  return <StatusHeader right={<ChromeButton label="Settings" icon="settings-outline" title={isTablet ? "Settings" : undefined} onPress={() => router.push("/family-settings")} />} />;
}

export function Toast() {
  const t = useTheme(), insets = useSafeAreaInsets();
  const msg = useApp(s => s.toast), canUndo = useApp(s => !!s.undo);
  const inTabs = useApp(s => s.member?.role === "caregiver" && !!s.patient?.onShift && !s.pickerOpen);
  if (!msg) return null;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", alignItems: "center", paddingBottom: insets.bottom + (inTabs ? 64 : 16) }]}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor: t.c.chrome, borderRadius: t.colorful ? 16 : 0 }, t.shadowLg]}>
        <Text maxFontSizeMultiplier={1.3} style={[t.font("bold"), { color: t.c.onChrome, fontSize: 15, flexShrink: 1 }]}>{msg}</Text>
        {canUndo ? (
          <Pressable accessibilityRole="button" onPress={undo} hitSlop={8} style={({ pressed }) => [styles.undo, { backgroundColor: pressed ? t.c.accentHover : t.c.accent, borderRadius: t.colorful ? 999 : 0 }]}>
            <Text style={[t.font("heavy"), { color: t.c.onAccent, fontSize: 15 }]}>Undo</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// A marker on every screen of anything that isn't production, so dev is never mistaken for prod: inside the
// status bar once signed in, floating in the corner on the sign-in and shift screens.
function EnvBadge() {
  if (ENV === "prod") return null;
  return (
    <View style={[styles.envInline]} accessibilityLabel={ENV === "demo" ? "Practice mode" : "Development version"}>
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{ENV === "demo" ? "PRACTICE" : "DEV"}</Text>
    </View>
  );
}

export function EnvTag() {
  const insets = useSafeAreaInsets();
  if (ENV === "prod") return null;
  return (
    <View pointerEvents="none" style={[styles.env, { top: insets.top + 2 }]}>
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{ENV === "demo" ? "PRACTICE" : "DEV"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 48 },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chromeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, minWidth: 36, justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 10 },
  yesterday: { paddingHorizontal: 16, paddingVertical: 8 },
  toast: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 18, paddingRight: 8, paddingVertical: 8, minHeight: 52, maxWidth: 560, marginHorizontal: 16 },
  undo: { paddingHorizontal: 16, paddingVertical: 8 },
  envInline: { backgroundColor: "rgba(200,40,40,0.9)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  env: { position: "absolute", right: 6, backgroundColor: "rgba(200,40,40,0.85)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
