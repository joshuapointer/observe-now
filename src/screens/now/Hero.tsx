// The big card at the top of Now: the current 15-minute box, what's in it, and a ring counting down to the next.
// Tapping it opens the record sheet.
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Theme, useTheme, XStack, YStack } from "tamagui";

import * as M from "@/lib/model";
import type { Entry } from "@/lib/types";
import { editEntry, openRecord } from "@/state/actions";
import { nowDetail, whoBy, type View as ViewModel } from "@/state/view";
import { catTheme } from "@/ui/cat";
import { ChevronRight, Pencil } from "@/ui/icons";
import { T } from "@/ui/primitives";
import { useColors } from "@/ui/theme";

function Ring({ progress, label, size = 64 }: { progress: number; label: string; size?: number }) {
  const c = useColors(), t = useTheme();
  const stroke = 6, r = (size - stroke) / 2, len = 2 * Math.PI * r;
  return (
    <YStack width={size} height={size} items="center" justify="center">
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        {/* The aperture ring's blue-to-aqua glass. */}
        <Defs>
          <LinearGradient id="aqua" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.aquaA.val as string} />
            <Stop offset="1" stopColor={t.aquaB.val as string} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#aqua)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </Svg>
      <T fontSize={15} lineHeight={18} weight="black">{label}</T>
      <T fontSize={10} lineHeight={12} weight="bold" color="$color11">min</T>
    </YStack>
  );
}

export function Hero({ V, saved, editable, pending, when, target }: {
  V: ViewModel; saved: Entry | null; editable: boolean; pending: string[]; when: string; target: boolean;
}) {
  const codes = M.entryCodes(saved);
  const cat = codes[0] ? V.ctx.reg.CAT[codes[0]] || null : null;
  const minsLeft = Math.ceil(V.boxLeftMs / 60000);
  const who = saved ? whoBy(saved, V) : "";
  const headline = pending.length
    ? `${pending.length} chosen · tap to finish`
    : codes.length ? M.codesText(codes, V.ctx, V.plain) : `What's ${V.ctx.name} doing?`;
  const detail = pending.length
    ? M.codesText(pending, V.ctx, V.plain)
    : codes.length
      ? [nowDetail(saved), who ? `Recorded by ${who}` : ""].filter(Boolean).join(" · ")
      : "Nothing recorded for this box yet. Tap to record.";

  return (
    <Theme name={codes.length && !pending.length ? catTheme(cat) : "accent"}>
      <YStack
        role="button"
        aria-label={`${when} box. ${headline}. ${detail}`}
        onPress={openRecord}
        bg={codes.length && !pending.length ? "$color4" : "$card"}
        rounded={28}
        p={20}
        gap={10}
        borderWidth={codes.length || pending.length ? 0 : 2}
        borderColor="$color6"
        borderStyle={codes.length || pending.length ? "solid" : "dashed"}
        shadowColor="$shadowColor"
        shadowOpacity={0.1}
        shadowRadius={18}
        shadowOffset={{ width: 0, height: 6 }}
        elevation={3}
        transition="quick"
        pressStyle={{ scale: 0.985 }}
      >
        <XStack items="center" gap={12}>
          <YStack flex={1} gap={4}>
            <T v="eyebrow" color="$color11">{target ? `Filling in ${when}` : `Now · ${when}`}</T>
            <T v="hero" fontSize={codes.length > 2 ? 24 : 28} lineHeight={codes.length > 2 ? 29 : 33} color="$color12" accessibilityLiveRegion="polite">
              {headline}
            </T>
          </YStack>
          {V.isToday && !target ? <Ring progress={V.boxProgress} label={String(minsLeft)} /> : null}
        </XStack>
        <XStack items="center" gap={8}>
          <T v="small" color="$color11" flex={1}>{detail}</T>
          {editable && saved ? (
            <XStack
              role="button"
              aria-label={`Change or remove what's saved at ${when}`}
              onPress={() => editEntry(saved.sid, saved.id)}
              hitSlop={8}
              items="center"
              gap={4}
              px={12}
              height={34}
              rounded={17}
              bg="$color6"
              pressStyle={{ scale: 0.95 }}
            >
              <Pencil size={14} color="$color12" />
              <T v="label" fontSize={14}>Edit</T>
            </XStack>
          ) : (
            <ChevronRight size={20} color="$color11" />
          )}
        </XStack>
      </YStack>
    </Theme>
  );
}
