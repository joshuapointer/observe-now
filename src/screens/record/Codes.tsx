// Step 1: the coach line, "Used lately", and the code groups (one open at a time) with their tiles.
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { activeCodes, DARK, SECTIONS, type Cat } from "@/lib/codes";
import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { editEntry, pick, toggleSection } from "@/state/actions";
import type { View as ViewModel } from "@/state/view";
import { Seg, T } from "@/ui/primitives";
import type { Theme } from "@/ui/theme";

const GAP = 10;

// Text on a filled category colour.
export const onFill = (t: Theme, cat: Cat | null) => (t.colorful ? "#fff" : cat === "danger" ? t.c.onDanger : t.c.onSolid);

export function StepBadge({ title, t }: { title: string; t: Theme }) {
  return (
    <View style={[styles.badge, { backgroundColor: t.c.accent, borderRadius: t.colorful ? 999 : 0 }]}>
      <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), { color: t.c.onAccent, fontSize: 13 }]}>{title}</Text>
    </View>
  );
}

type CoachProps = { V: ViewModel; t: Theme; target: boolean; when: string; saved: Entry | null };
export function Coach({ V, t, target, when, saved }: CoachProps) {
  const name = V.ctx.name;
  return (
    <View style={[styles.coach, { backgroundColor: t.colorful ? t.c.press : t.c.panel, borderLeftColor: t.c.accent, borderRadius: t.r.md }]}>
      <View style={{ flexDirection: "row" }}><StepBadge title="Step 1 of 2" t={t} /></View>
      <T v="lede">
        {target ? (
          <><Text style={t.font("black")}>{`You're filling in the ${when} box.`}</Text>{` Tap a group below, then what ${name} was doing — you can choose more than one.`}</>
        ) : (
          <><Text style={t.font("black")}>{`What is ${name} doing right now?`}</Text>{` Tap a group below, then the closest match. It goes in the ${when} box. Choose more than one if several things are happening.`}</>
        )}
      </T>
      {saved ? (
        <View style={{ flexDirection: "row" }}>
          <Seg small title={`Change or remove what's saved at ${when}`} onPress={() => editEntry(saved.sid, saved.id)} hitSlop={6} style={{ flexShrink: 1 }} />
        </View>
      ) : null}
    </View>
  );
}

export function Recents({ V, selected }: { V: ViewModel; selected: string[] }) {
  const { ctx, plain } = V;
  return (
    <View style={styles.recents}>
      <T v="eyebrow">Used lately</T>
      <View style={styles.wrap}>
        {V.recents.map(c => (
          <Seg
            key={c}
            on={selected.includes(c)}
            cat={ctx.reg.CAT[c] || null}
            lead={plain ? undefined : ctx.reg.CODE[c]?.abbr || undefined}
            title={M.codeText(c, ctx, plain).split(" — ")[0]}
            onPress={() => pick(c)}
          />
        ))}
      </View>
    </View>
  );
}

type TileProps = { code: string; k: string; desc: string; on: boolean; dark: boolean; cat: Cat | null; disabled: boolean; plain: boolean; width: number; t: Theme };

const CodeTile = memo(function CodeTile({ code, k, desc, on, dark, cat, disabled, plain, width, t }: TileProps) {
  const c = t.cat(cat);
  const bg = on ? c.a : dark ? (t.colorful ? c.bg : c.bg2) : c.bg;
  const fg = on ? onFill(t, cat) : t.c.ink;
  const kc = on ? onFill(t, cat) : c.ink;
  const border = on ? (t.colorful ? t.c.ground : c.a) : dark ? c.cat : t.colorful ? t.c.line : t.c.edge;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={k && k !== desc ? `${k}: ${desc}` : desc}
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={() => pick(code)}
      style={({ pressed }) => [
        styles.tile,
        { width, backgroundColor: bg, borderColor: border, borderWidth: dark || on || !t.colorful ? 2 : StyleSheet.hairlineWidth * 2, borderRadius: t.colorful ? 18 : 0 },
        !on && t.shadow,
        on && t.colorful && t.shadowLg,
        pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
        disabled && { opacity: 0.55 },
      ]}
    >
      {t.colorful && !on ? <View style={[styles.tileBar, { backgroundColor: c.cat }]} /> : null}
      {k ? (
        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={[t.font("black"), { color: kc, fontSize: 16, opacity: plain && !on ? 0.8 : 1 }]}>{k}</Text>
      ) : null}
      <Text maxFontSizeMultiplier={1.4} style={[t.font("bold"), { color: fg, fontSize: 15, lineHeight: 20 }]}>{desc}</Text>
    </Pressable>
  );
});

type SectionsProps = { V: ViewModel; t: Theme; selected: string[]; open: string | null; canLog: boolean; width: number; minTile: number };

export function Sections({ V, t, selected, open, canLog, width, minTile }: SectionsProps) {
  const { ctx, plain } = V;
  const cols = Math.max(2, Math.floor((width + GAP) / (minTile + GAP)));
  const tileW = Math.floor((width - GAP * (cols - 1)) / cols);
  const active = activeCodes(ctx.reg);
  return (
    <View style={{ gap: 10 }}>
      {SECTIONS.map(sec => [sec, active.filter(c => c.section === sec.id)] as const).filter(([, list]) => list.length).map(([sec, list]) => {
        const isOpen = open === sec.id, picked = list.filter(c => selected.includes(c.id)).length;
        const k = t.cat(sec.id), fg = onFill(t, sec.id);
        const title = plain ? sec.plain : sec.title;
        return (
          <View key={sec.id} style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${title}, ${picked ? `${picked} chosen, ` : ""}${list.length} ${list.length === 1 ? "choice" : "choices"}`}
              onPress={() => toggleSection(sec.id)}
              style={({ pressed }) => [
                styles.secHead,
                { backgroundColor: k.b, borderRadius: t.colorful ? 18 : 0 },
                t.shadow,
                isOpen && { borderWidth: 3, borderColor: t.colorful ? k.cat : t.c.accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text maxFontSizeMultiplier={1.4} style={[t.font("heavy"), { color: fg, fontSize: 17, flex: 1 }]}>{title}</Text>
              {picked ? (
                <View style={[styles.picked, { backgroundColor: t.colorful ? "#fff" : t.c.accent, borderRadius: t.colorful ? 999 : 0 }]}>
                  <Text maxFontSizeMultiplier={1.3} style={[t.font("heavy"), { color: t.colorful ? k.b : t.c.onAccent, fontSize: 13 }]}>{`${picked} chosen`}</Text>
                </View>
              ) : null}
              <Text maxFontSizeMultiplier={1.3} style={[t.font("semibold"), { color: fg, fontSize: 14, opacity: 0.9 }]}>{`${list.length} ${list.length === 1 ? "choice" : "choices"}`}</Text>
              <Text style={[t.font("heavy"), { color: fg, fontSize: 16 }]} accessibilityElementsHidden importantForAccessibility="no">{isOpen ? "▴" : "▾"}</Text>
            </Pressable>
            {isOpen ? (
              <View style={styles.grid}>
                {list.map(c => (
                  <CodeTile
                    key={c.id}
                    code={c.id}
                    k={c.abbr || (plain ? "" : M.codeText(c.id, ctx))}
                    desc={M.codeText(c.id, ctx, plain)}
                    on={selected.includes(c.id)}
                    dark={DARK.includes(c.id)}
                    cat={ctx.reg.CAT[c.id] || sec.id}
                    disabled={!canLog}
                    plain={plain}
                    width={tileW}
                    t={t}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 13, paddingVertical: 5 },
  coach: { padding: 14, gap: 10, borderLeftWidth: 5 },
  recents: { gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: { minHeight: 72, paddingVertical: 12, paddingLeft: 18, paddingRight: 12, gap: 2, justifyContent: "center", overflow: "hidden" },
  tileBar: { position: "absolute", left: 0, top: 16, bottom: 16, width: 5, borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingHorizontal: 18, paddingVertical: 12 },
  picked: { paddingHorizontal: 10, paddingVertical: 3 },
});
