// The record sheet: every choice on one scrolling list, most-used first, then by group. Tap everything that fits
// (more than one is fine), optionally add where, pain and a note, then Save. Saves into the current box, or the
// box chosen from the day's row.
import { memo } from "react";
import { ScrollView } from "react-native";
import { Theme, XStack, YStack } from "tamagui";

import { activeCodes, DARK, PAINS, PLACES, SECTIONS, type Cat } from "@/lib/codes";
import * as M from "@/lib/model";
import { cancelPending, closeRecord, commit, editEntry, pick, setDraft, setPain, setPlace, toggleDetails, unpick } from "@/state/actions";
import { useApp } from "@/state/app";
import { canEdit, notAsked, useView, whoBy, type View as ViewModel } from "@/state/view";
import { catTheme } from "@/ui/cat";
import { Check, ChevronDown, Pencil, TriangleAlert } from "@/ui/icons";
import { useLayout } from "@/ui/layout";
import { Button, Chip, Field, Section, Seg, T } from "@/ui/primitives";
import { Sheet } from "@/ui/Sheet";

const GAP = 10;

type TileProps = { code: string; abbr: string; desc: string; on: boolean; strong: boolean; cat: Cat | null; width: number };

// Plain words first; the code's abbreviation is a small tag. A tick shows it's chosen.
const Tile = memo(function Tile({ code, abbr, desc, on, strong, cat, width }: TileProps) {
  return (
    <Theme name={catTheme(cat)}>
      <YStack
        role="button"
        aria-label={abbr ? `${desc} (${abbr})` : desc}
        aria-selected={on}
        accessibilityState={{ selected: on }}
        onPress={() => pick(code)}
        width={width}
        minH={76}
        p={14}
        gap={6}
        rounded={20}
        bg={on ? "$color9" : strong ? "$color5" : "$color3"}
        borderWidth={2}
        borderColor={on ? "$color9" : strong ? "$color8" : "transparent"}
        justify="space-between"
        transition="quick"
        pressStyle={{ scale: 0.96 }}
      >
        <T fontSize={16} lineHeight={21} weight="heavy" color={on ? "$white1" : "$color12"} pr={22}>{desc}</T>
        {abbr ? (
          <XStack>
            <YStack px={7} py={1} rounded={6} bg={on ? "$color10" : "$color5"}>
              <T fontSize={11} lineHeight={15} weight="black" color={on ? "$white1" : "$color11"}>{abbr}</T>
            </YStack>
          </XStack>
        ) : null}
        <YStack
          position="absolute"
          t={12}
          r={12}
          width={24}
          height={24}
          rounded={12}
          items="center"
          justify="center"
          bg={on ? "$white1" : "transparent"}
          borderWidth={on ? 0 : 2}
          borderColor="$color7"
        >
          {on ? <Check size={15} color="$color11" strokeWidth={3} /> : null}
        </YStack>
      </YStack>
    </Theme>
  );
});

// What's already in this box. New choices are added to it; changing or removing it happens in the edit sheet
// (only for your own shift's entries: the rest are someone else's record).
function Saved({ V, when }: { V: ViewModel; when: string }) {
  const S = useApp();
  const e = V.d.byKey[V.key];
  if (!e || !(M.entryCodes(e).length || e.note)) return null;
  const mine = canEdit(S, V, e);
  const who = whoBy(e, V);
  return (
    <XStack bg="$card" rounded={20} p={14} gap={12} items="center" borderWidth={1} borderColor="$color5">
      <YStack flex={1} gap={2}>
        <T v="eyebrow">{`Already saved at ${when}`}</T>
        <T v="label" fontSize={16}>{M.entryLine(e, V.ctx, V.plain)}</T>
        <T v="small" fontSize={13}>
          {mine ? "Anything you tap now is added to it." : `Recorded${who ? ` by ${who}` : ""} on another shift. You can add to it, but only they could change it.`}
        </T>
      </YStack>
      {mine ? <Button kind="soft" small icon={Pencil} title="Change or remove" onPress={() => editEntry(e.sid, e.id)} /> : null}
    </XStack>
  );
}

function Details() {
  const V = useView();
  const place = useApp(s => s.place), pain = useApp(s => s.pain), note = useApp(s => s.drafts.note || "");
  return (
    <YStack gap={18} transition="quick" enterStyle={{ opacity: 0, y: 8 }}>
      <Section title={`Where is ${V.ctx.name}?`}>
        <XStack flexWrap="wrap" gap={8}>{PLACES.map(o => <Seg key={o} small title={o} on={place === o} onPress={() => setPlace(o)} />)}</XStack>
      </Section>
      <Section title="Pain level (7 or more alerts family)">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
          <XStack gap={6} px={20}>
            {PAINS.map(o => (
              <Seg
                key={o}
                small
                title={notAsked(o)}
                cat={o !== "—" && Number(o) >= 7 ? "danger" : undefined}
                on={pain === o}
                onPress={() => setPain(o)}
                accessibilityLabel={o === "—" ? "Pain not asked" : `Pain ${o}`}
                minW={44}
              />
            ))}
          </XStack>
        </ScrollView>
      </Section>
      <Field
        label="Anything to add?"
        value={note}
        onChangeText={v => setDraft("note", v)}
        placeholder="For example: asked the time twice, settled with the radio on"
        autoCorrect
        returnKeyType="done"
      />
    </YStack>
  );
}

export function RecordSheet({ open }: { open: boolean }) {
  const V = useView();
  const { width, isTablet } = useLayout();
  const selected = useApp(s => s.pendingCodes);
  const target = useApp(s => s.target);
  const detailsOn = useApp(s => s.details), pain = useApp(s => s.pain), place = useApp(s => s.place);
  const note = useApp(s => s.drafts.note || "");
  const { ctx, plain } = V;
  const when = M.hhmm(V.info.start + V.targetIdx * M.SLOT_MS);
  const active = activeCodes(ctx.reg);
  const sheetW = (isTablet ? 640 : width) - 40;
  const cols = sheetW >= 520 ? 3 : 2;
  const tileW = Math.floor((sheetW - GAP * (cols - 1)) / cols);
  const details = (detailsOn && selected.length > 0) || selected.some(c => ["PN", "US"].includes(c)) || pain !== "—" || !!place || !!note;
  const kind = V.pendingAlertKind;
  const recents = V.recents.filter(c => active.some(a => a.id === c));

  const tile = (id: string, section: Cat) => (
    <Tile
      key={id}
      code={id}
      abbr={plain ? "" : ctx.reg.CODE[id]?.abbr || ""}
      desc={M.codeText(id, ctx, plain)}
      on={selected.includes(id)}
      strong={DARK.includes(id)}
      cat={ctx.reg.CAT[id] || section}
      width={tileW}
    />
  );

  const footer = (
    <>
      {selected.length ? (
        <XStack flexWrap="wrap" gap={6}>
          {selected.map(c => <Chip key={c} title={M.codeText(c, ctx, true)} cat={ctx.reg.CAT[c] || null} onRemove={() => unpick(c)} />)}
        </XStack>
      ) : null}
      {details ? <Details /> : selected.length ? (
        <XStack role="button" onPress={toggleDetails} items="center" gap={6} self="flex-start" minH={36} pressStyle={{ opacity: 0.6 }}>
          <T v="label" color="$accent11">Add where, pain or a note</T>
          <ChevronDown size={18} color="$accent11" />
        </XStack>
      ) : null}
      {kind ? (
        <XStack items="center" gap={8}>
          <TriangleAlert size={18} color="$red11" />
          <T v="label" color="$red11" weight="black">This also sends a red alert to family.</T>
        </XStack>
      ) : null}
      <XStack gap={10} items="center">
        <Button kind="ghost" big title="Cancel" onPress={cancelPending} />
        <Button
          kind="primary"
          big
          grow
          disabled={!selected.length}
          title={selected.length ? `Save ${when}` : "Tap what's happening"}
          sub={selected.length > 1 ? `· ${selected.length} things` : undefined}
          onPress={commit}
        />
      </XStack>
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={closeRecord}
      title={`What's ${ctx.name} doing?`}
      subtitle={target ? `Filling in the ${when} box · tap all that fit` : `For ${when} · tap all that fit`}
      footer={footer}
    >
      <Saved V={V} when={when} />
      {recents.length ? (
        <Section title="Used lately">
          <XStack flexWrap="wrap" gap={GAP}>{recents.map(c => tile(c, ctx.reg.CAT[c] || "sleep"))}</XStack>
        </Section>
      ) : null}
      {SECTIONS.map(sec => {
        const list = active.filter(c => c.section === sec.id && !recents.includes(c.id));
        if (!list.length) return null;
        return (
          <Section key={sec.id} title={plain ? sec.plain : sec.title}>
            <XStack flexWrap="wrap" gap={GAP}>{list.map(c => tile(c.id, sec.id))}</XStack>
          </Section>
        );
      })}
    </Sheet>
  );
}
