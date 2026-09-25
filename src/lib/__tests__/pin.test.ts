import { createHash } from "node:crypto";

import { pinHash } from "../pin";

const nodeSha = async (s: string) => createHash("sha256").update(s).digest("hex");

// The practice roster's hashes were made by the PWA; both apps must agree on them byte for byte.
describe("pinHash", () => {
  it("matches the PWA for Dana (1234)", async () => {
    expect(await pinHash("cg-dana", "1234", nodeSha)).toBe("353ec585d7394d12063000aca56789dfd4eea70b1b759ea31906bf78b83e6bbd");
  });
  it("matches the PWA for Sam (1234)", async () => {
    expect(await pinHash("cg-sam", "1234", nodeSha)).toBe("17d41215a749a6f38a7faf031b9144fab02b12a4777ef7bdfebb8d306a5675af");
  });
  it("lowercases whatever the hasher returns", async () => {
    expect(await pinHash("x", "0000", async () => "ABCDEF")).toBe("abcdef");
  });
});
