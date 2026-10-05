import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardBaseLayout } from "@/components/dashboard/dashboard-base-layout";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

const DashboardBaseLayoutForTest = DashboardBaseLayout as unknown as (props: {
  lang: "en" | "ar";
  active: string;
  children?: ReactNode;
}) => ReturnType<typeof DashboardBaseLayout>;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", { href, ...props }, children),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt = "", src, ...props }: { alt?: string; src: string }) =>
    createElement("img", { alt, src: typeof src === "string" ? src : "", ...props }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard",
}));

jest.mock("@/lib/i18n", () => ({
  localizePath: (_lang: string, path: string) => path,
}));

jest.mock("@/lib/runtime-environment", () => ({
  isBillingDisabledInCurrentEnv: () => false,
}));

jest.mock("@/assets", () => ({
  tragramLogo: "/tragram-logo.png",
}));

jest.mock("@/components/profile/profile-shell", () => ({
  ProfileMenuPanel: ({ className }: { className?: string }) =>
    createElement("div", { className }, "Profile menu"),
}));

jest.mock("@/components/profile/logout-modal", () => ({
  LogoutModal: ({ open }: { open: boolean }) =>
    open ? createElement("div", null, "Logout modal") : null,
}));

jest.mock("@/components/dashboard/dashboard-shell.module.css", () => ({
  gridBg: "gridBg",
}));

jest.mock("@/components/dashboard/dashboard-base-layout.module.css", () => ({
  layout: "layout",
  sidebarSlot: "sidebarSlot",
  content: "content",
}));

jest.mock("@/components/dashboard/dashboard-sidebar.module.css", () => ({
  sidebar: "sidebar",
  brand: "brand",
  section: "section",
  sectionTitle: "sectionTitle",
  nav: "nav",
  sectionLinks: "sectionLinks",
  expanded: "expanded",
  link: "link",
  active: "active",
  accent: "accent",
  focusable: "focusable",
}));

jest.mock("@/components/dashboard/mobile-bottom-nav.module.css", () => ({
  nav: "nav",
  link: "link",
  active: "active",
}));

jest.mock("@/components/i18n/route-messages-provider", () => ({
  useRouteMessages: () => ({
    dashboardChrome: {
      brand: "Tragram",
      aria: {
        primaryNav: "Primary navigation",
        moreOpen: "Open more menu",
        moreClose: "Close more menu",
      },
      sections: {
        dashboard: "Dashboard",
        settings: "Settings",
        other: "Other",
      },
      links: {
        home: "Home",
        channels: "Channels",
        reports: "Reports",
        profile: "Profile",
        notifications: "Notifications",
        plan: "Plan",
        language: "Language",
        security: "Security",
        contact: "Contact",
        more: "More",
        logout: "Log out",
      },
    },
    profilePages: {
      logout: {
        title: "Log out",
        message: "Are you sure?",
        cancel: "Cancel",
        confirm: "Log out",
      },
    },
  }),
}));

describe("DashboardSkeleton", () => {
  test("renders the shared dashboard loading structure in the live page order", () => {
    const html = renderToStaticMarkup(createElement(DashboardSkeleton));

    expect(html).toContain("dashboard-page-skeleton");
    expect(html).toContain("dashboard-page-skeleton-top");
    expect(html).toContain("dashboard-page-skeleton-chips");
    expect(html).toContain("dashboard-page-skeleton-balance");
    expect(html).toContain("dashboard-area-connections");
    expect(html).toContain("dashboard-area-checklist");
    expect(html).toContain("dashboard-area-orders");
    expect(html).toContain("dashboard-page-skeleton-tabs");
  });

  test("can omit the checklist rail when requested", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardSkeleton, { showChecklist: false })
    );

    expect(html).toContain("dashboard-grid--no-checklist");
    expect(html).not.toContain("dashboard-area-checklist");
  });

  test("sits inside the dashboard layout with sidebar chrome", () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardBaseLayoutForTest,
        { lang: "en", active: "home" },
        createElement(DashboardSkeleton)
      )
    );

    expect(html).toContain("sidebarSlot");
    expect(html).toContain("content");
    expect(html).toContain("dashboard-page-skeleton");
    expect(html).toContain("Home");
    expect(html).toContain("Channels");
    expect(html).toContain("Reports");
  });
});
