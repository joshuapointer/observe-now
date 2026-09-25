import * as Crypto from "expo-crypto";

// Shift PINs only stop someone recording under the wrong name by accident; a 4-digit hash is not a secret.
// Must stay byte-for-byte identical to the PWA's pinHash so PINs set on either app work on both.
export type Sha256Hex = (input: string) => Promise<string>;

export const pinInput = (cid: string, pin: string) => `garthlog-pin:${cid}:${pin}`;

const expoSha256: Sha256Hex = input =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, { encoding: Crypto.CryptoEncoding.HEX });

export const pinHash = async (cid: string, pin: string, sha256: Sha256Hex = expoSha256) =>
  (await sha256(pinInput(cid, pin))).toLowerCase();
