import { shouldDisablePublicVisualRuntime } from "./public-route-runtime";

describe("public route runtime", () => {
  test("disables heavy visual runtime on localized blog pages", () => {
    expect(shouldDisablePublicVisualRuntime("/en/blog")).toBe(true);
    expect(shouldDisablePublicVisualRuntime("/en/blog/low-latency-telegram-trade-copier")).toBe(
      true,
    );
    expect(shouldDisablePublicVisualRuntime("/ar/blog/telegram-copier-supported-platforms")).toBe(
      true,
    );
  });

  test("keeps public visual runtime on the marketing homepage", () => {
    expect(shouldDisablePublicVisualRuntime("/en")).toBe(false);
    expect(shouldDisablePublicVisualRuntime("/en/features")).toBe(false);
  });
});
