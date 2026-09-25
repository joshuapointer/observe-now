// Everything a person sees before the main app, ported from the PWA's renderScreens gate cases
// (views.js ~681-694).
import { DEMO } from "@/lib/config";
import { useApp } from "@/state/app";
import { AuthView } from "./AuthView";
import { LoadingView } from "./LoadingView";
import { PickerView } from "./PickerView";
import { ShiftView } from "./ShiftView";
import { VerifyView } from "./VerifyView";

export function GateScreen() {
  const authReady = useApp(s => s.authReady);
  const user = useApp(s => s.user);
  const links = useApp(s => s.links);
  const pid = useApp(s => s.pid);
  const pickerOpen = useApp(s => s.pickerOpen);
  const member = useApp(s => s.member);
  const patient = useApp(s => s.patient);

  if (!authReady) return <LoadingView />;
  if (!user) return <AuthView />;
  if (!DEMO && !user.emailVerified) return <VerifyView />;
  if (links === undefined) return <LoadingView />;
  if (!pid || pickerOpen) return <PickerView />;
  if (member === undefined || member === null) return <LoadingView />;
  if (member.role === "family") return <LoadingView />; // the root layout routes family members into (family)
  if (patient === undefined) return <LoadingView />;
  if (!patient?.onShift) return <ShiftView />;
  return <LoadingView />; // onShift is set: the root layout routes into (care)
}
