// Who gets a notification. Each device that allows notifications has a document at patients/{p}/devices/{installId}
// saying which login it is, which side of the app it's using for this person, and whether it wants every update.
export type DeviceDoc = {
  id: string; // install id
  uid: string;
  token: string;
  platform: string;
  mode: "care" | "family";
  every?: boolean; // family: every entry, not just alerts and notes
  at?: number;
};

// care: the caregiver devices (messages from family). family: everyone following along (messages from the
// caregiver, alerts, notes). updates: family who asked for every entry.
export type Audience = "care" | "family" | "updates";

// Only current members (a device left behind by someone taken off the log is skipped), never the sending device,
// and each token once.
export function recipients(devices: DeviceDoc[], memberIds: string[], audience: Audience, self: string): string[] {
  const members = new Set(memberIds);
  const want = (d: DeviceDoc) =>
    audience === "care" ? d.mode === "care" : audience === "family" ? d.mode === "family" : d.mode === "family" && !!d.every;
  return Array.from(new Set(devices.filter(d => d.id !== self && d.token && members.has(d.uid) && want(d)).map(d => d.token)));
}
