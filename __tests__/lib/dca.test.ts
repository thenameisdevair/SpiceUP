// __tests__/lib/dca.test.ts
import { frequencyToLabel, DCA_FREQUENCY_OPTIONS } from "@/lib/dca";

describe("DCA_FREQUENCY_OPTIONS", () => {
  it("has exactly 3 entries", () => {
    expect(DCA_FREQUENCY_OPTIONS).toHaveLength(3);
  });

  it("has correct label/value pairs", () => {
    expect(DCA_FREQUENCY_OPTIONS).toEqual([
      { label: "Every 12h", value: "PT12H" },
      { label: "Daily", value: "P1D" },
      { label: "Weekly", value: "P1W" },
    ]);
  });
});

describe("frequencyToLabel", () => {
  it('maps "PT12H" to "Every 12h"', () => {
    expect(frequencyToLabel("PT12H")).toBe("Every 12h");
  });

  it('maps "P1D" to "Daily"', () => {
    expect(frequencyToLabel("P1D")).toBe("Daily");
  });

  it('maps "P1W" to "Weekly"', () => {
    expect(frequencyToLabel("P1W")).toBe("Weekly");
  });

  it("returns the raw value for unknown frequencies", () => {
    expect(frequencyToLabel("P2W")).toBe("P2W");
    expect(frequencyToLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
