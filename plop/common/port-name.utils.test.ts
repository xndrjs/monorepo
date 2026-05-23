import { describe, expect, it } from "vitest";
import { stripTrailingPortLabel } from "./port-name.utils.ts";

describe("stripTrailingPortLabel", () => {
  it("keeps names that end with port inside a word", () => {
    expect(stripTrailingPortLabel("ManualTransport")).toBe("ManualTransport");
    expect(stripTrailingPortLabel("manual-transport")).toBe("manual-transport");
  });

  it("strips a separate Port suffix", () => {
    expect(stripTrailingPortLabel("ManualTransportPort")).toBe(
      "ManualTransport",
    );
    expect(stripTrailingPortLabel("manual-transport-port")).toBe(
      "manual-transport",
    );
    expect(stripTrailingPortLabel("Manual Transport Port")).toBe(
      "Manual Transport",
    );
  });
});
