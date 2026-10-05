# Webapp CSS Split And Reuse Task List

Last updated: 2026-02-12
Scope: `packages/webapp/**/*.css`

## Baseline From Full Scan

Initial snapshot (before execution):

- Total CSS files: `53`
- Total CSS in repo: `2,994,251` bytes
- CSS referenced by source imports: `823,852` bytes
- Unreferenced CSS in repo: `2,170,399` bytes
- Unreferenced CSS under `src/app`: `340,276` bytes
- Unreferenced CSS under `public`: `1,830,123` bytes

Current snapshot (after this pass via `npm run css:report`):

- Total CSS files: `45`
- Total CSS in repo: `842,955` bytes
- CSS referenced by source imports: `834,845` bytes
- Unreferenced CSS in repo: `8,110` bytes
- Unreferenced CSS under `src/app`: `8,110` bytes
- Unreferenced CSS under `public`: `0` bytes

Largest referenced CSS files:

1. `packages/webapp/src/app/[lang]/home2/styles/bootstrap.min.css` (`232,757` bytes)
2. `packages/webapp/src/app/styles/legacy/home2-landing.css` (`95,501` bytes)
3. `packages/webapp/src/app/styles/legacy/core.css` (`92,285` bytes)
4. `packages/webapp/src/app/[lang]/home2/styles/animate.css` (`76,809` bytes)
5. `packages/webapp/src/app/[lang]/home2/styles/all.min.css` (`74,300` bytes)
6. `packages/webapp/src/app/styles/legacy/legacy-pages.css` (`53,363` bytes)
7. `packages/webapp/src/app/styles/pages/profile.css` (`22,201` bytes)

## P0 Tasks (Immediate)

- [x] Remove or archive dead CSS not imported by source:
  - `packages/webapp/src/app/original_global.css`
  - `packages/webapp/src/app/[lang]/home2/styles/custom.css`
- [x] Confirm runtime usage for `public/*/css/*` files (no source references found). If unused, delete `public/ar/css/*`, `public/en/css/*`, and `public/css/*`.
- [ ] Stop loading `packages/webapp/src/app/[lang]/home2/styles/all.min.css` in app layouts that only need a small icon set; replace with a scoped icon strategy (subset CSS or icon component package). (temporarily rolled back to `all.min.css` because icon glyphs regressed with subset CSS)
- [x] Split `packages/webapp/src/app/styles/pages/dashboard.css` into component-level files and import only where needed.
- [x] Split `packages/webapp/src/app/styles/pages/profile.css` and remove cross-route leakage into non-profile screens.
- [x] Split `packages/webapp/src/app/styles/pages/channels.css` and `packages/webapp/src/app/styles/pages/reports.css` by component.
- [ ] Extract reusable CTA and language switch styles from `packages/webapp/src/app/styles/pages/auth.css` into shared component CSS modules (rolled back after icon/SVG visual regression; redo with parity checks).
- [x] Add a route CSS budget check in CI (fail build when route CSS bundle grows past agreed threshold).

## P1 Tasks (Refactor)

- [ ] Break legacy monoliths (`core.css`, `home2-landing.css`, `legacy-pages.css`) into route/component CSS modules.
- [ ] Keep legacy-only CSS in legacy route layouts, avoid sharing on modern app routes.
- [ ] Replace broad vendor CSS where possible:
  - `animate.css` -> only required keyframes
  - `bootstrap.min.css` -> local layout utilities for used parts only
  - `slicknav.min.css`, `magnific-popup.css`, `mousecursor.css` -> load only when the matching widget exists
- [ ] Move repeated dark theme primitives into shared tokens/utilities and remove duplicated hardcoded color blocks.

## P2 Tasks (Optimization And Guardrails)

- [x] Add an automatic import graph report (`scripts/css-usage-report`) and commit JSON/MD output to track drift.
- [ ] Migrate remaining global selectors to CSS modules (or scoped files) for page/component ownership.
- [ ] Add visual regression snapshots for major routes after each CSS split batch.
- [x] Enforce one source of truth for legacy static assets (no triplicated `public/ar`, `public/en`, `public` CSS trees unless required).

## Execution Log (This Pass)

- Added generated Font Awesome subset for modern app routes:
  - `src/app/styles/vendor/fontawesome-app-subset.css`
  - generator: `scripts/generate-fontawesome-subset.cjs`
  - size reduced from `74,300` to `8,110` bytes for app route icon CSS source.
- Updated route layouts:
  - `src/app/[lang]/dashboard/layout.tsx`
  - `src/app/[lang]/channels/layout.tsx`
  - `src/app/[lang]/reports/layout.tsx`
  - `src/app/[lang]/profile/layout.tsx`
- Added shared profile shell extraction:
  - new file: `src/app/styles/pages/profile-shell.css`
  - `src/app/styles/pages/profile.css` now profile-route specific.
- Removed dead and duplicate CSS:
  - deleted `src/app/original_global.css`
  - deleted `src/app/[lang]/home2/styles/custom.css`
  - deleted all files under `public/css`, `public/en/css`, and `public/ar/css`.
- Added guardrails and reporting:
  - `scripts/css-usage-report.cjs`
  - `scripts/check-css-budgets.cjs`
  - package scripts: `css:report`, `css:budget`, `css:fa-subset`, `build:with-css-budget`
  - `prebuild` now regenerates Font Awesome subset automatically.
- Split channels CSS by feature and kept route-level ownership via import hub:
  - import hub: `src/app/styles/pages/channels.css`
  - new files: `src/app/styles/pages/channels-shell.css`, `src/app/styles/pages/channels-list.css`, `src/app/styles/pages/channels-sheets.css`, `src/app/styles/pages/channels-detail.css`, `src/app/styles/pages/channels-responsive.css`
- Split dashboard CSS by feature and kept route-level ownership via import hub:
  - import hub: `src/app/styles/pages/dashboard.css`
  - new files: `src/app/styles/pages/dashboard-main.css`, `src/app/styles/pages/dashboard-modals.css`, `src/app/styles/pages/dashboard-orders.css`, `src/app/styles/pages/dashboard-layout.css`, `src/app/styles/pages/dashboard-skeleton.css`
- Split reports CSS by feature and kept route-level ownership via import hub:
  - import hub: `src/app/styles/pages/reports.css`
  - new files: `src/app/styles/pages/reports-overview.css`, `src/app/styles/pages/reports-filters.css`, `src/app/styles/pages/reports-share.css`, `src/app/styles/pages/reports-skeleton.css`, `src/app/styles/pages/reports-responsive.css`
- Rolled back CTA/language-switch module extraction to restore original icon/SVG behavior:
  - restored global class-based styling in `src/components/ui/appzen-cta.tsx` and `src/components/i18n/language-switch.tsx`.
  - restored shared CTA/language-switch blocks in `src/app/styles/pages/auth.css`.
  - removed temporary module files (`appzen-cta.module.css`, `language-switch.module.css`).
- Rolled back modern app icon source to restore missing dashboard glyphs:
  - `src/app/[lang]/dashboard/layout.tsx`, `src/app/[lang]/channels/layout.tsx`, `src/app/[lang]/reports/layout.tsx`, and `src/app/[lang]/profile/layout.tsx` now import `../home2/styles/all.min.css`.
  - `src/app/styles/vendor/fontawesome-app-subset.css` remains generated but currently unreferenced.
  - `scripts/audit-css-ownership.cjs` now accepts either `fontawesome-app-subset.css` or `../home2/styles/all.min.css` for modern app layouts.
- Validation re-run after split:
  - `npm run css:audit` passes.
  - `npm run css:report` regenerated `css-usage-report.json` and `css-usage-report.md`.
  - `npm run build:with-css-budget` passes.

## Full CSS Inventory (All Files)

### Global Shared CSS

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/globals.css` | Imported by `packages/webapp/src/app/[lang]/layout.tsx` | Keep as import registry only; avoid writing selectors here. | P1 |
| `packages/webapp/src/app/styles/shared/tokens.css` | Imported by `packages/webapp/src/app/globals.css` | Keep as canonical dark-theme tokens and move duplicated literals from page CSS into tokens. | P1 |
| `packages/webapp/src/app/styles/shared/base.css` | Imported by `packages/webapp/src/app/globals.css` | Keep minimal reset/base rules only. | P2 |
| `packages/webapp/src/app/styles/shared/motion.css` | Imported by `packages/webapp/src/app/globals.css` | Keep shared motion utilities; remove duplicates from legacy and page files. | P2 |
| `packages/webapp/src/app/styles/shared/modals.css` | Imported by `packages/webapp/src/app/globals.css` | Keep generic modal primitives; route-specific modal styles move to component CSS modules. | P1 |
| `packages/webapp/src/app/styles/shared/utilities.css` | Imported by `packages/webapp/src/app/globals.css` | Keep small utility surface; prevent growth. | P2 |

### Component CSS Modules

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| _None currently for CTA/language switch_ | N/A | Extraction postponed until icon/SVG parity is guaranteed across navbar/auth/hero usages. | P0 |

### Modern App Page CSS

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/styles/pages/auth.css` | Imported by `packages/webapp/src/app/[lang]/auth/layout.tsx` | CTA/language-switch styles restored here for visual parity; remaining work is splitting auth shell/form blocks into smaller modules without changing icon rendering. | P0 |
| `packages/webapp/src/app/styles/pages/dashboard.css` | Imported by `packages/webapp/src/app/[lang]/dashboard/layout.tsx` | Import hub split completed (`dashboard-main`, `dashboard-modals`, `dashboard-orders`, `dashboard-layout`, `dashboard-skeleton`). | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-main.css` | Imported via `packages/webapp/src/app/styles/pages/dashboard.css` | Dashboard top chrome, balance, checklist, tabs, and integration card styles. | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-modals.css` | Imported via `packages/webapp/src/app/styles/pages/dashboard.css` | Dashboard sheets/modals (close order, accounts, connect, notifications modal). | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-orders.css` | Imported via `packages/webapp/src/app/styles/pages/dashboard.css` | Order groups, home-order card variants, and order summaries. | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-layout.css` | Imported via `packages/webapp/src/app/styles/pages/dashboard.css` | Dashboard layout areas, nav/sidebar, and desktop responsive grid behavior. | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-shared.css` | Imported by channels/reports/profile layouts | Shared dashboard chrome + primitives extracted from dashboard route styles. Keep stable and avoid route-specific selectors. | P0 |
| `packages/webapp/src/app/styles/pages/dashboard-skeleton.css` | Imported via `packages/webapp/src/app/styles/pages/dashboard.css` | Dashboard page skeleton/loading states and skeleton keyframes. | P0 |
| `packages/webapp/src/app/styles/pages/channels.css` | Imported by `packages/webapp/src/app/[lang]/channels/layout.tsx` | Import hub split completed (`channels-shell`, `channels-list`, `channels-sheets`, `channels-detail`, `channels-responsive`). | P0 |
| `packages/webapp/src/app/styles/pages/channels-shell.css` | Imported via `packages/webapp/src/app/styles/pages/channels.css` | Route shell/header/list + channels page skeleton. | P0 |
| `packages/webapp/src/app/styles/pages/channels-list.css` | Imported via `packages/webapp/src/app/styles/pages/channels.css` | Channels row/swap/toggle/empty-state primitives. | P0 |
| `packages/webapp/src/app/styles/pages/channels-sheets.css` | Imported via `packages/webapp/src/app/styles/pages/channels.css` | Add/select/delete/connect sheet and dialog styles. | P0 |
| `packages/webapp/src/app/styles/pages/channels-detail.css` | Imported via `packages/webapp/src/app/styles/pages/channels.css` | Subscription detail/settings pages + chart/tabs/skeleton sections. | P0 |
| `packages/webapp/src/app/styles/pages/channels-responsive.css` | Imported via `packages/webapp/src/app/styles/pages/channels.css` | Channels route desktop/media-query overrides. | P0 |
| `packages/webapp/src/app/styles/pages/profile.css` | Imported by profile layout | Split into `profile-nav.module.css`, `profile-page.module.css`, `profile-mobile.module.css`; move shared nav shell to reusable component CSS. | P0 |
| `packages/webapp/src/app/styles/pages/profile-shell.css` | Imported by dashboard/channels/reports/profile layouts | New shared extraction for profile nav shell and dashboard "More" modal panel. | P0 |
| `packages/webapp/src/app/styles/pages/profile-legacy-scaffold.css` | Imported via `packages/webapp/src/app/styles/pages/profile.css` | Merge needed scaffold rules into new profile shared module, delete remainder after migration. | P1 |
| `packages/webapp/src/app/styles/pages/reports.css` | Imported by `packages/webapp/src/app/[lang]/reports/layout.tsx` | Import hub split completed (`reports-overview`, `reports-filters`, `reports-share`, `reports-skeleton`, `reports-responsive`). | P0 |
| `packages/webapp/src/app/styles/pages/reports-overview.css` | Imported via `packages/webapp/src/app/styles/pages/reports.css` | Reports overview cards/charts/history sections. | P0 |
| `packages/webapp/src/app/styles/pages/reports-filters.css` | Imported via `packages/webapp/src/app/styles/pages/reports.css` | Filter sheet controls/date/pills and apply CTA. | P0 |
| `packages/webapp/src/app/styles/pages/reports-share.css` | Imported via `packages/webapp/src/app/styles/pages/reports.css` | Select/share sheets and selector popover styles. | P0 |
| `packages/webapp/src/app/styles/pages/reports-skeleton.css` | Imported via `packages/webapp/src/app/styles/pages/reports.css` | Reports loading skeleton states + keyframes + focus styles. | P0 |
| `packages/webapp/src/app/styles/pages/reports-responsive.css` | Imported via `packages/webapp/src/app/styles/pages/reports.css` | Reports desktop/mobile media-query overrides. | P0 |
| `packages/webapp/src/app/styles/pages/contact.css` | Imported by `packages/webapp/src/app/[lang]/profile/contact/page.tsx` | Convert to `contact-form.module.css` and scope to contact page components. | P1 |

### Legacy Import Wrappers

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/styles/pages/legacy-home.css` | Imported by `packages/webapp/src/app/[lang]/(legacy)/page.tsx` | Replace with explicit imports of split legacy home files only; remove broad `@import` chain. | P1 |
| `packages/webapp/src/app/styles/pages/legacy-marketing.css` | Imported by legacy about/contact/features/pricing pages | Replace with per-page CSS modules for each legacy marketing page. | P1 |
| `packages/webapp/src/app/styles/pages/legacy-legal.css` | Imported by legacy legal pages | Replace with shared legal page module + per-page override modules. | P1 |
| `packages/webapp/src/app/styles/pages/legacy-faqs.css` | Imported by `packages/webapp/src/app/[lang]/(legacy)/faqs/page.tsx` | Replace with scoped FAQ module and remove inherited global section blocks. | P1 |

### Legacy Monolith CSS

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/styles/legacy/core.css` | Imported by home2 layout and legacy wrapper CSS files | Split by existing sections (`Global Variables`, `Header`, `Hero`, `About`, `Features`, `Footer`, etc.) into route/component files under `styles/legacy/sections/`. | P1 |
| `packages/webapp/src/app/styles/legacy/home2-landing.css` | Imported by home2 layout and `legacy-home.css` | Split versioned sections: isolate Home V2, remove Home V3 block if unused, and move section CSS next to `home2/components/*`. | P1 |
| `packages/webapp/src/app/styles/legacy/legacy-pages.css` | Imported by not-found page and legacy wrapper CSS files | Split by page sections (`About`, `Features`, `FAQs`, `Contact`, `Legal`, `404`) into per-page files with route-only imports. | P1 |

### Home2 Vendor And Legacy Vendor CSS (src)

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/[lang]/home2/styles/bootstrap.min.css` | Imported by home2 and legacy layouts | Restrict to legacy/home2 route group only; replace used grid/utilities with local CSS over time and remove bootstrap import. | P1 |
| `packages/webapp/src/app/[lang]/home2/styles/all.min.css` | Imported by legacy/home2 layouts and temporarily by dashboard/channels/reports/profile layouts | Temporary rollback for icon correctness; switch modern layouts back to subset only after generator parity fix. | P0 |
| `packages/webapp/src/app/styles/vendor/fontawesome-app-subset.css` | Currently unreferenced | Keep generated subset artifact; fix generator (include font-face/style tail) and re-enable in modern layouts. | P0 |
| `packages/webapp/src/app/[lang]/home2/styles/animate.css` | Imported by home2 and legacy layouts | Replace with a tiny local animation file for actually used classes (`fadeInUp`, etc.) and drop full library. | P1 |
| `packages/webapp/src/app/[lang]/home2/styles/swiper-bundle.min.css` | Imported by home2 and legacy layouts | Lazy load only on pages rendering Swiper components; keep out of non-swiper routes. | P1 |
| `packages/webapp/src/app/[lang]/home2/styles/slicknav.min.css` | Imported by home2 and legacy layouts | Lazy load only where slicknav is mounted; evaluate removal if not used in modern routes. | P1 |
| `packages/webapp/src/app/[lang]/home2/styles/magnific-popup.css` | Imported by home2 and legacy layouts | Load only on pages that use popup component; move to component-level style include. | P1 |
| `packages/webapp/src/app/[lang]/home2/styles/mousecursor.css` | Imported by home2 and legacy layouts | Gate behind feature flag or remove if custom cursor is not required. | P2 |
| `packages/webapp/src/app/[lang]/home2/styles/custom.css` | Removed | Deleted as dead CSS with no source references. | P0 |

### Source-Orphan CSS

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/src/app/original_global.css` | Removed | Deleted as dead backup CSS to prevent accidental reintroduction. | P0 |

### Public CSS (No Source References Found)

| File | Current usage | Split or reuse plan | Priority |
| --- | --- | --- | --- |
| `packages/webapp/public/css/*` | Removed | Deleted unreferenced duplicate static CSS tree. | P0 |
| `packages/webapp/public/en/css/*` | Removed | Deleted unreferenced duplicate static CSS tree. | P0 |
| `packages/webapp/public/ar/css/*` | Removed | Deleted unreferenced duplicate static CSS tree. | P0 |

## Proposed Split Targets By Component/Page

- Auth:
  - `src/components/auth/auth-shell.module.css`
  - `src/components/auth/auth-form.module.css`
  - `src/components/ui/appzen-cta.module.css`
  - `src/components/i18n/language-switch.module.css`
- Dashboard:
  - `src/components/dashboard/dashboard-shell.module.css`
  - `src/components/dashboard/orders-list.module.css`
  - `src/components/dashboard/connections-grid.module.css`
  - `src/components/dashboard/notifications.module.css`
  - `src/components/dashboard/sheets.module.css`
- Channels:
  - `src/components/channels/channels-page.module.css`
  - `src/components/channels/channel-row.module.css`
  - `src/components/channels/channel-sheets.module.css`
- Reports:
  - `src/components/reports/reports-page.module.css`
  - `src/components/reports/reports-filters.module.css`
  - `src/components/reports/reports-share.module.css`
- Profile:
  - `src/components/profile/profile-nav.module.css`
  - `src/components/profile/profile-forms.module.css`
  - `src/components/profile/profile-mobile.module.css`
- Legacy:
  - `src/app/styles/legacy/sections/*.css` split by page/section ownership

## Validation Checklist

- [x] `pnpm --filter webapp build` passes.
- [x] Confirm no route loads deleted CSS files.
- [x] Compare route CSS chunk sizes before/after split.
- [ ] Verify dark theme rendering on: auth, dashboard, channels, reports, profile, home2, legacy marketing pages.
- [ ] Verify responsive behavior on mobile and desktop after moving selectors to component-level files.

## File Count Check

- Rows above cover all scanned CSS files: `45/45` (active after rollback of CTA/language-switch module files).
