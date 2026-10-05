import { notFound } from "next/navigation";
import SubscriptionLayout from "./subscription/layout";
import InvoicesLayout from "./invoices/layout";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("commercial profile route layouts", () => {
  const originalMode = process.env.COMMERCIAL_MODE;

  afterEach(() => {
    process.env.COMMERCIAL_MODE = originalMode;
    jest.clearAllMocks();
  });

  it.each([
    ["subscription", SubscriptionLayout],
    ["invoices", InvoicesLayout],
  ])("returns not-found before rendering %s in free mode", (_name, Layout) => {
    process.env.COMMERCIAL_MODE = "FREE_BASIC";

    expect(() => Layout({ children: <div>billing content</div> })).toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["subscription", SubscriptionLayout],
    ["invoices", InvoicesLayout],
  ])("preserves %s in standard billing mode", (_name, Layout) => {
    process.env.COMMERCIAL_MODE = "STANDARD_BILLING";
    const child = <div>billing content</div>;

    expect(Layout({ children: child })).toBe(child);
    expect(notFound).not.toHaveBeenCalled();
  });
});
