import { useWindowDimensions } from "react-native";

// iPad (and big Android tablets or split view wide enough) get the two-pane layouts; phones get one column.
export const TABLET_MIN = 768;
export const RAIL_WIDTH = 340;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600 && width >= TABLET_MIN;
  return { width, height, isTablet, landscape: width > height };
}
