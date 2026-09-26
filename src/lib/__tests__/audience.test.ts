import { recipients, type DeviceDoc } from "../audience";

const d = (id: string, uid: string, mode: "care" | "family", every = false, token = `T-${id}`): DeviceDoc => ({ id, uid, token, platform: "ios", mode, every });
const devices = [
  d("ipad", "care-login", "care"),
  d("ann", "ann", "family"),
  d("ann-ipad", "ann", "family", true),
  d("bob", "bob", "family", true),
  d("gone", "removed", "family", true),
  d("dup", "bob", "family", true, "T-bob"),
];
const members = ["care-login", "ann", "bob"];

describe("who gets a notification", () => {
  it("family messages go to the caregiver devices", () => expect(recipients(devices, members, "care", "ann")).toEqual(["T-ipad"]));
  it("caregiver messages and alerts go to every family device, not the sender", () =>
    expect(recipients(devices, members, "family", "ipad")).toEqual(["T-ann", "T-ann-ipad", "T-bob"]));
  it("every update only goes to family who asked for it", () => expect(recipients(devices, members, "updates", "ipad")).toEqual(["T-ann-ipad", "T-bob"]));
  it("skips someone taken off the log, and the device that sent it", () => {
    expect(recipients(devices, members, "updates", "bob")).toEqual(["T-ann-ipad", "T-bob"]); // the duplicate token still reaches bob's other install
    expect(recipients(devices, members, "family", "ann")).not.toContain("T-ann");
    expect(recipients(devices, members, "family", "ipad")).not.toContain("T-gone");
  });
});
