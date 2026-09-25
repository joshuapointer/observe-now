// Phone numbers in E.164 ("+14155550123"): the form Firebase signs in with and puts in the token's
// phone_number claim, so it is also the key phone invitations are filed under (invitesByPhone/{phone}).
// Without a country code, a 10-digit number is taken as North American (+1) when the device is set to the
// US or Canada; anything else needs the + and country code typed in.
const NANP = new Set(["US", "CA", "PR", "GU", "VI", "AS", "MP"]);

export function toE164(input: string, region?: string | null): string | null {
  const s = input.trim().replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(s)) return s;
  if (/^00\d{8,15}$/.test(s)) return "+" + s.slice(2);
  if (/^\d+$/.test(s) && region && NANP.has(region.toUpperCase())) {
    if (s.length === 10) return "+1" + s;
    if (s.length === 11 && s.startsWith("1")) return "+" + s;
  }
  return null;
}

// Loose check for a field that takes either an email address or a phone number.
export const looksLikeEmail = (s: string) => s.includes("@");
