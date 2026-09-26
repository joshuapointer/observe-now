// App chrome shared by every signed-in screen: the header (who, live status, help and account), the toast, and
// the environment marker.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, XStack, YStack } from "tamagui";

import { ENV_TAG } from "@/lib/config";
import * as M from "@/lib/model";
import { openModal, undo } from "@/state/actions";
import { actingAs, useApp } from "@/state/app";
import { useView } from "@/state/view";
import { CircleHelp, UserRound } from "./icons";
import { IconButton, LiveDot, T } from "./primitives";
import { TAB_BAR_HEIGHT } from "./TabBar";

// One line saying what matters right now: family see whether the caregiver is there; caregivers see whether
// family are watching.
function useStatusLine() {
  const V = useView();
  const status = useApp(s => s.status);
  const isFamily = useApp(s => actingAs(s) === "family");
  const cg = V.onShift ? M.firstName(V.onShift.name) : "";
  if (!status.online) {
    return { live: false, offline: true, text: isFamily ? "Offline · showing the last update" : "Offline · entries send when you're back" };
  }
  if (isFamily) {
    if (!cg) return { live: false, offline: false, text: "No one on shift right now" };
    const seen = V.careActive ? "active now" : V.careSeen ? `last active ${M.agoText(V.careSeen, V.now)}` : "not active yet";
    return { live: V.careActive, offline: false, text: `${cg} is on shift · ${seen}` };
  }
  const watching = V.live.length;
  return { live: watching > 0, offline: false, text: `${cg} on shift · ${watching ? `${watching} family watching` : "no family watching"}` };
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const V = useView();
  const saving = useApp(s => s.status.pending > 0 && s.status.online && actingAs(s) === "care");
  const line = useStatusLine();
  return (
    <XStack bg="$page" pt={insets.top + 6} pb={8} pl={insets.left + 18} pr={insets.right + 10} items="center" gap={10}>
      <YStack flex={1} gap={2}>
        <XStack items="center" gap={8}>
          <T v="title" fontSize={26} numberOfLines={1} accessibilityRole="header" flexShrink={1}>{V.ctx.name}</T>
          <EnvBadge />
        </XStack>
        <XStack items="center" gap={7}>
          {line.offline ? <YStack width={10} height={10} rounded={5} bg="$red9" /> : <LiveDot on={line.live} />}
          <T v="small" color={line.offline ? "$red11" : "$color11"} numberOfLines={1} flexShrink={1}>
            {line.text}{saving ? " · saving…" : ""}
          </T>
        </XStack>
      </YStack>
      <IconButton icon={CircleHelp} label="Help" onPress={() => openModal("help")} tone="soft" />
      <IconButton icon={UserRound} label="You and this device" onPress={() => openModal("account")} tone="soft" />
    </XStack>
  );
}

export function Toast() {
  const insets = useSafeAreaInsets();
  const msg = useApp(s => s.toast), canUndo = useApp(s => !!s.undo);
  const inTabs = useApp(s => !!s.member && !s.pickerOpen && (actingAs(s) === "family" || !!s.patient?.onShift));
  return (
    <YStack position="absolute" l={0} r={0} b={insets.bottom + (inTabs ? TAB_BAR_HEIGHT + 22 : 16)} items="center" pointerEvents="box-none">
      <AnimatePresence>
        {msg ? (
          <XStack
            key={msg}
            accessibilityLiveRegion="polite"
            role="alert"
            items="center"
            gap={12}
            pl={18}
            pr={canUndo ? 6 : 18}
            py={6}
            minH={52}
            maxW={560}
            mx={16}
            rounded={26}
            bg="$color12"
            shadowColor="$shadowColor"
            shadowOpacity={0.25}
            shadowRadius={18}
            shadowOffset={{ width: 0, height: 8 }}
            elevation={8}
            transition="bouncy"
            enterStyle={{ opacity: 0, y: 20, scale: 0.94 }}
            exitStyle={{ opacity: 0, y: 12, scale: 0.96 }}
          >
            <T v="label" color="$color1" fontSize={16} flexShrink={1}>{msg}</T>
            {canUndo ? (
              <XStack role="button" onPress={undo} hitSlop={8} px={16} height={40} rounded={20} bg="$accent9" items="center" pressStyle={{ scale: 0.95 }}>
                <T v="label" color="$white1" weight="heavy">Undo</T>
              </XStack>
            ) : null}
          </XStack>
        ) : null}
      </AnimatePresence>
    </YStack>
  );
}

// A marker on every screen of anything that isn't production, so dev is never mistaken for prod: in the header
// once signed in, floating in the corner on the sign-in and shift screens.
function EnvBadge() {
  if (!ENV_TAG) return null;
  return (
    <YStack aria-label={ENV_TAG.label} bg="$red9" px={6} py={2} rounded={5}>
      <T fontSize={10} lineHeight={13} weight="black" color="$white1">{ENV_TAG.text}</T>
    </YStack>
  );
}

export function EnvTag() {
  const insets = useSafeAreaInsets();
  if (!ENV_TAG) return null;
  return (
    <YStack position="absolute" r={8} t={insets.top + 4} pointerEvents="none">
      <EnvBadge />
    </YStack>
  );
}
