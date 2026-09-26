// Pushed pages (Settings, Fall report, Codes…) keep the native header, restyled to sit on the page colour.
import { useColors } from "./theme";

export function useStackHeader() {
  const c = useColors();
  return {
    headerShown: true,
    headerStyle: { backgroundColor: c.page },
    headerShadowVisible: false,
    headerTintColor: c.accentInk,
    headerTitleStyle: { fontFamily: "Nunito_800ExtraBold", color: c.ink },
    headerBackTitle: "Back",
    contentStyle: { backgroundColor: c.page },
  };
}
