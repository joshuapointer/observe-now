// What family see first: what's happening right now, in plain words, in the colour of what it is. Also the
// "What family see" peek on the caregiver's iPad.
import { Theme, YStack } from "tamagui";

import * as M from "@/lib/model";
import { nowDetail, nowText, whoBy, type View as ViewModel } from "@/state/view";
import { Watermark } from "@/ui/Brand";
import { catTheme } from "@/ui/cat";
import { T } from "@/ui/primitives";

export function NowCard({ V, compact }: { V: ViewModel; compact?: boolean }) {
  const e = V.latest;
  const codes = M.entryCodes(e);
  const cat = codes.includes("FL") ? "danger" : codes[0] ? V.ctx.reg.CAT[codes[0]] || null : null;
  const who = e ? whoBy(e, V) : "";
  const detail = nowDetail(e);
  return (
    <Theme name={catTheme(cat)}>
      <YStack
        bg="$color9"
        rounded={28}
        p={compact ? 18 : 22}
        gap={8}
        shadowColor="$color9"
        shadowOpacity={0.35}
        shadowRadius={20}
        shadowOffset={{ width: 0, height: 10 }}
        elevation={6}
        transition="medium"
        enterStyle={{ opacity: 0, scale: 0.97 }}
        overflow="hidden"
      >
        <Watermark size={compact ? 150 : 200} r={compact ? -40 : -50} b={compact ? -50 : -60} opacity={0.22} />
        <T v="eyebrow" color="$white1" opacity={0.85}>{`${V.ctx.name} · right now`}</T>
        <T v="hero" fontSize={compact ? 24 : 30} lineHeight={compact ? 29 : 35} color="$white1" accessibilityLiveRegion="polite">
          {nowText(e, V, true)}
        </T>
        {detail ? <T v="body" color="$white1" opacity={0.92}>{detail}</T> : null}
        <T v="small" color="$white1" opacity={0.85}>
          {e ? `Updated ${M.agoText(e.markedAt, V.now)}${who ? ` by ${who}` : ""}` : `${V.ctx.caregiver} will update this through the day`}
        </T>
      </YStack>
    </Theme>
  );
}
