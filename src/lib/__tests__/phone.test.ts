import { toE164 } from "../phone";

describe("toE164", () => {
  it("keeps a number that already has a country code", () => {
    expect(toE164("+44 7700 900123")).toBe("+447700900123");
    expect(toE164("+1 (415) 555-0123", "GB")).toBe("+14155550123");
  });

  it("turns a 00 international prefix into +", () => {
    expect(toE164("0044 7700 900123")).toBe("+447700900123");
  });

  it("assumes +1 for a 10- or 11-digit number on a North American device", () => {
    expect(toE164("(415) 555-0123", "US")).toBe("+14155550123");
    expect(toE164("1 415 555 0123", "ca")).toBe("+14155550123");
  });

  it("needs a country code everywhere else", () => {
    expect(toE164("07700 900123", "GB")).toBeNull();
    expect(toE164("4155550123")).toBeNull();
  });

  it("rejects things that aren't phone numbers", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("+12")).toBeNull();
    expect(toE164("ellen@example.com", "US")).toBeNull();
  });
});
