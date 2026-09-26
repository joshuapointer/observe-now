// While sign-in and the first data load: the brand's eye, its aperture turning a little faster. The lens is the
// same size and place as the splash screen's (120pt), so the splash hands over without a jump.
import { YStack } from "tamagui";

import { BrandEye } from "@/ui/Brand";
import { Screen, T } from "@/ui/primitives";

export function LoadingView() {
  return (
    <Screen items="center" justify="center" aria-label="Loading">
      <BrandEye size={188} speed={6} />
      <YStack position="absolute" b="28%" transition="lazy" enterStyle={{ opacity: 0 }}>
        <T v="eyebrow">Loading…</T>
      </YStack>
    </Screen>
  );
}
