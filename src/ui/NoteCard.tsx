// A written note, set apart from what was recorded: amber, with a pen, and who wrote it. Caregiver-only notes
// say so with a lock.
import { Theme, XStack, YStack } from "tamagui";

import { Lock, NotebookPen } from "./icons";
import { T } from "./primitives";

export function NoteCard({ text, meta, privateOnly }: { text: string; meta?: string; privateOnly?: boolean }) {
  return (
    <Theme name="amber">
      <XStack
        accessible
        aria-label={`${privateOnly ? "Caregivers-only note" : "Note"}: ${text}${meta ? `. ${meta}` : ""}`}
        bg="$color3"
        borderLeftWidth={4}
        borderLeftColor="$color9"
        rounded={16}
        px={14}
        py={12}
        gap={10}
        items="flex-start"
      >
        {privateOnly ? <Lock size={18} color="$color11" mt={2} /> : <NotebookPen size={18} color="$color11" mt={2} />}
        <YStack flex={1} gap={3}>
          <T fontSize={16} lineHeight={22} color="$color12">{text}</T>
          {meta ? <T v="small" fontSize={13} color="$color11">{meta}</T> : null}
        </YStack>
      </XStack>
    </Theme>
  );
}
