import { MIXPANEL_EVENT_NAMES, type MixpanelEventArgs, type SupportedMixpanelEventName } from "./types";

type Assert<T extends true> = T;
type IsSubset<Left, Right> = Exclude<Left, Right> extends never ? true : false;
type _MappedEventsAreDeclared = Assert<IsSubset<SupportedMixpanelEventName, (typeof MIXPANEL_EVENT_NAMES)[number]>>;

describe("web Mixpanel event contract", () => {
  it("keeps the supplied 103 event names unique and limits mapped web events to that inventory", () => {
    const mappedEventsAreDeclared: _MappedEventsAreDeclared = true;
    expect(MIXPANEL_EVENT_NAMES).toHaveLength(103);
    expect(new Set(MIXPANEL_EVENT_NAMES).size).toBe(MIXPANEL_EVENT_NAMES.length);
    expect(mappedEventsAreDeclared).toBe(true);
  });

  it("accepts exact payloads and rejects missing, unknown, or invalid event arguments at compile time", () => {
    const valid: MixpanelEventArgs<"screen_viewed"> = ["screen_viewed", { screen_name: "faqs" }];
    const parameterless: MixpanelEventArgs<"logout"> = ["logout"];
    expect([valid, parameterless]).toHaveLength(2);

    // @ts-expect-error screen_viewed requires a screen_name payload
    const missingRequired: MixpanelEventArgs<"screen_viewed"> = ["screen_viewed"];
    // @ts-expect-error checkout_started is not part of the existing event contract
    const inventedName: MixpanelEventArgs<"checkout_started"> = ["checkout_started"];
    // @ts-expect-error paywall_viewed accepts only declared source values
    const invalidEnum: MixpanelEventArgs<"paywall_viewed"> = ["paywall_viewed", { source: "checkout" }];
    expect([missingRequired, inventedName, invalidEnum]).toBeDefined();
  });
});
