import fs from "node:fs";
import path from "node:path";
import en from "../messages/en/common.json";
import ar from "../messages/ar/common.json";

const registry = fs.readFileSync(path.resolve(__dirname, "../../../api-gateway/src/utils/api-error-codes.ts"), "utf8");
const codes = [...registry.matchAll(/:\s*'([A-Z][A-Z_]+)'/g)].map(match => match[1]);
describe.each([["en", en.apiErrors], ["ar", ar.apiErrors]] as const)("%s error translations", (_locale, messages) => {
    test.each(codes)("has a reviewed message for %s", code => {
        expect((messages as Record<string, string>)[code]).toEqual(expect.any(String));
        expect((messages as Record<string, string>)[code]?.trim().length).toBeGreaterThan(0);
    });
});
