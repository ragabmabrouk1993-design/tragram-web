import { execFileSync } from "node:child_process";
import path from "node:path";

describe("Font Awesome subset generator", () => {
  it("ignores Font Awesome utility classes used with icons", () => {
    const webappRoot = path.resolve(__dirname, "../../../..");

    expect(() => {
      execFileSync("node", ["./scripts/generate-fontawesome-subset.cjs"], {
        cwd: webappRoot,
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});
