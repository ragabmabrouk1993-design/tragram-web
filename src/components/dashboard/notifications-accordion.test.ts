import {
  getNextExpandedNotificationId,
  normalizeExpandedIdAfterListChange,
} from "./notifications-accordion";

describe("notifications accordion helpers", () => {
  test("expands a collapsed item", () => {
    expect(getNextExpandedNotificationId(null, "notification-a")).toBe("notification-a");
  });

  test("collapses when clicking the currently expanded item", () => {
    expect(getNextExpandedNotificationId("notification-a", "notification-a")).toBeNull();
  });

  test("switches to a different item when another trigger is clicked", () => {
    expect(getNextExpandedNotificationId("notification-a", "notification-b")).toBe(
      "notification-b"
    );
  });

  test("resets expanded id when it no longer exists in the list", () => {
    expect(
      normalizeExpandedIdAfterListChange("notification-a", [{ id: "notification-b" }])
    ).toBeNull();
  });

  test("preserves expanded id while it exists in the list", () => {
    expect(
      normalizeExpandedIdAfterListChange("notification-a", [
        { id: "notification-a" },
        { id: "notification-b" },
      ])
    ).toBe("notification-a");
  });
});
