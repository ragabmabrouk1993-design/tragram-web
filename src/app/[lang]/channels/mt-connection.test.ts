import { hasConnectedMtAccount } from "./mt-connection";

describe("hasConnectedMtAccount", () => {
  test("returns true when at least one account is active and connected", () => {
    expect(
      hasConnectedMtAccount([
        { isActive: false, connectionStatus: "CONNECTED" },
        { isActive: true, connectionStatus: "CONNECTED" },
      ])
    ).toBe(true);
  });

  test("returns false when no active connected account exists", () => {
    expect(
      hasConnectedMtAccount([
        { isActive: true, connectionStatus: "DISCONNECTED" },
        { isActive: false, connectionStatus: "CONNECTED" },
        { isActive: true, connectionStatus: "ERROR" },
      ])
    ).toBe(false);
  });
});
