// One chat message, drawn like iMessage: your own on the right in blue with white text, everyone else's on the
// left in grey with their name above. The corner nearest the sender stays tight, like the bubble's tail.
import { YStack } from "tamagui";

import { T } from "./primitives";

export function ChatBubble({ text, mine, who, when, isNew }: {
  text: string;
  mine: boolean;
  who?: string; // shown above other people's bubbles
  when: string;
  isNew?: boolean;
}) {
  return (
    <YStack
      gap={2}
      items={mine ? "flex-end" : "flex-start"}
      accessible
      aria-label={`${mine ? "You" : who || ""}, ${when}${isNew ? ", new" : ""}: ${text}`}
      transition="quick"
      enterStyle={{ opacity: 0, y: 8, scale: 0.98 }}
    >
      {!mine && who ? <T v="small" fontSize={12} lineHeight={15} mx={14}>{who}</T> : null}
      <YStack
        maxW="82%"
        px={14}
        py={9}
        rounded={20}
        borderBottomRightRadius={mine ? 6 : 20}
        borderBottomLeftRadius={mine ? 20 : 6}
        bg={mine ? "$blue9" : "$color4"}
      >
        <T color={mine ? "$white1" : "$color12"}>{text}</T>
      </YStack>
      <T fontSize={11} lineHeight={14} mx={14} weight={isNew ? "heavy" : "semibold"} color={isNew ? "$accent11" : "$color10"}>
        {isNew ? `${when} · New` : when}
      </T>
    </YStack>
  );
}
