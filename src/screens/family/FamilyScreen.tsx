import { Screen, T } from "@/ui/primitives";

// framed = the caregiver's preview of the family screen (no sending, no acks).
export function FamilyScreen({ framed = false }: { framed?: boolean }) {
  return <Screen><T v="title">FamilyScreen {framed ? "(preview)" : ""}</T></Screen>;
}
