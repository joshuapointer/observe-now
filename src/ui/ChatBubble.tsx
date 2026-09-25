// One chat message, drawn like iMessage: your own on the right in blue with white text, everyone else's on the
// left in grey with their name above. The corner nearest the sender stays tight, like the bubble's tail.
import { StyleSheet, View } from "react-native";

import { T } from "./primitives";
import { useTheme } from "./theme";

const BLUE = "#0a84ff";

export function ChatBubble({ text, mine, who, when, isNew }: {
  text: string;
  mine: boolean;
  who?: string; // shown above other people's bubbles
  when: string;
  isNew?: boolean;
}) {
  const t = useTheme();
  const grey = t.night ? "#2c2c30" : "#e9e9eb";
  return (
    <View style={[styles.row, { alignItems: mine ? "flex-end" : "flex-start" }]} accessible accessibilityLabel={`${mine ? "You" : who || ""}, ${when}${isNew ? ", new" : ""}: ${text}`}>
      {!mine && who ? <T v="small" color={t.c.mute} style={styles.who}>{who}</T> : null}
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: BLUE, borderBottomRightRadius: 5 }
            : { backgroundColor: grey, borderBottomLeftRadius: 5 },
        ]}
      >
        <T color={mine ? "#ffffff" : t.c.ink}>{text}</T>
      </View>
      <T v="small" color={isNew ? t.c.accentInk : t.c.mute} weight={isNew ? "bold" : undefined} style={styles.when}>
        {isNew ? `${when} · New` : when}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  who: { marginHorizontal: 14, fontSize: 12 },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  when: { marginHorizontal: 14, fontSize: 11 },
});
