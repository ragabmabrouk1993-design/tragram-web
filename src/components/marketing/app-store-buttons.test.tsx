import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppStoreButtons, { APP_STORE_LINKS } from "./app-store-buttons";

describe("AppStoreButtons", () => {
  test("renders both published store badges as accessible external links", () => {
    const html = renderToStaticMarkup(createElement(AppStoreButtons, { locale: "en" }));

    expect(html).toContain(`href="${APP_STORE_LINKS.appStore}"`);
    expect(html).toContain(`href="${APP_STORE_LINKS.googlePlay}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Download on the App Store");
    expect(html).toContain("Get it on Google Play");
  });

  test("uses Arabic accessible labels without changing the published destinations", () => {
    const html = renderToStaticMarkup(createElement(AppStoreButtons, { locale: "ar" }));

    expect(html).toContain(`href="${APP_STORE_LINKS.appStore}"`);
    expect(html).toContain(`href="${APP_STORE_LINKS.googlePlay}"`);
    expect(html).toContain("نزّله من App Store");
    expect(html).toContain("احصل عليه على Google Play");
  });
});
