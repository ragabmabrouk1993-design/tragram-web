# Webapp Style Ownership and Naming

## Folder responsibilities

- `src/app/globals.css`
  - import hub only
  - loads Tailwind and shared CSS layers
- `src/app/styles/shared/*.css`
  - cross-route primitives only (tokens, base, motion, modal primitives, utilities)
- `src/app/styles/pages/*.css`
  - page or feature-domain styles with explicit route ownership
- `src/app/styles/vendor/*.css`
  - generated vendor subsets used by specific route groups
- `src/components/**/*.module.css`
  - component-scoped reusable styles (preferred for reusable UI patterns)

## Route ownership map

- `src/app/[lang]/dashboard/layout.tsx`
  - icon source: `styles/vendor/fontawesome-app-subset.css`
  - owns `styles/pages/dashboard.css`
  - owns `styles/pages/profile-shell.css` (shared profile navigation panel)
- `src/app/[lang]/channels/layout.tsx`
  - icon source: `styles/vendor/fontawesome-app-subset.css`
  - owns `styles/pages/dashboard-shared.css` (shared dashboard chrome primitives)
  - owns `styles/pages/channels.css`
  - also imports `styles/pages/profile-shell.css` (shared profile navigation panel)
- `src/app/[lang]/reports/layout.tsx`
  - icon source: `styles/vendor/fontawesome-app-subset.css`
  - owns `styles/pages/dashboard-shared.css` (shared dashboard chrome primitives)
  - owns `styles/pages/reports.css`
  - also imports `styles/pages/profile-shell.css` (shared profile navigation panel)
- `src/app/[lang]/profile/layout.tsx`
  - icon source: `styles/vendor/fontawesome-app-subset.css`
  - owns `styles/pages/dashboard-shared.css` (shared dashboard chrome primitives)
  - owns `styles/pages/profile-shell.css` (shared profile navigation panel)
  - owns `styles/pages/profile.css`
- `src/app/[lang]/(public)/layout.tsx`
  - icon source: `styles/vendor/fontawesome-app-subset.css`
  - owns scoped legacy/public bundles, including `marketing/styles/mousecursor.public-scoped.css`
  - owns `styles/pages/public-marketing.css`
  - must stay anchored to `#public-route-root` for public-route-only styling
- `src/app/[lang]/profile/contact/page.tsx`
  - owns `styles/pages/contact.css` (page-local import)

## Naming conventions

- Page selectors use a stable domain prefix:
  - `dashboard-*`, `channels-*`, `reports-*`, `profile-*`, `contact-*`
- Shared selectors use neutral/global prefixes:
  - `ui-*` for reusable primitives
  - neutral utility names only if intentionally global (`reveal`, `tg-grid`, `theme-toggle`)
- Avoid cross-domain selectors in page files.
  - If shared by 2+ domains, move to `styles/shared/*`.

## Page Import Hubs

- Keep route entry files as ownership hubs when splitting large page CSS:
  - `styles/pages/dashboard.css` imports `dashboard-main.css`, `dashboard-modals.css`, `dashboard-orders.css`, `dashboard-layout.css`, and `dashboard-skeleton.css`.
  - `styles/pages/channels.css` imports `channels-shell.css`, `channels-list.css`, `channels-sheets.css`, `channels-detail.css`, and `channels-responsive.css`.
  - `styles/pages/reports.css` imports `reports-overview.css`, `reports-filters.css`, `reports-share.css`, `reports-skeleton.css`, and `reports-responsive.css`.
- This keeps route imports stable while enabling smaller feature-focused files.

## Reusable Component Styles

- Reusable primitives should ideally live as component CSS modules, not in page CSS.
- Dashboard chrome modules:
  - `src/components/dashboard/dashboard-shell.module.css`
  - `src/components/dashboard/dashboard-base-layout.module.css`
  - `src/components/dashboard/dashboard-sidebar.module.css`
  - `src/components/dashboard/mobile-bottom-nav.module.css`
- Dashboard sheet/modal modules:
  - `src/components/dashboard/connect-sheets.module.css`
  - `src/components/dashboard/notifications-modal.module.css`
- Shared logout modal module:
  - `src/components/profile/logout-modal.module.css`
- Temporary exception (visual parity rollback):
  - CTA and language-switch styling is currently restored in `src/app/styles/pages/auth.css`.
  - Keep `src/components/ui/appzen-cta.tsx` and `src/components/i18n/language-switch.tsx` on global class hooks until icon/SVG parity checks pass.

## Icon CSS Source

- Canonical app/public icon source:
  - `styles/vendor/fontawesome-app-subset.css`
- Legacy `all.min.css` imports are fallback-only and must not be used in modern route layouts.

## Z-index conventions

- Use shared tokens from `styles/shared/modals.css` for app-wide overlays:
  - `--z-overlay-nav`
  - `--z-overlay-backdrop`
  - `--z-overlay-sheet`
  - `--z-overlay-popover`
  - `--z-overlay-dialog`
- Page files can use local low z-index values (`1`, `5`) for internal layering only.

## Validation guardrail

- Run `npm run css:audit --workspace=@tragram/webapp` to validate:
  - route/layout CSS ownership boundaries
  - no legacy monolith imports (`home2/styles/custom.css`)
  - no app-shell dependency on `html.appzen-home2`-scoped selectors
  - class coverage parity for active prefixed/source-of-truth selectors
- Run `npm run css:scan:leak --workspace=@tragram/webapp` to enforce:
  - non-dashboard app-shell layouts never import `styles/pages/dashboard.css`
  - app-shell shared route imports (`styles/pages/dashboard-shared.css`)
  - no route-specific selectors inside `styles/shared/*`
  - no `html.appzen-home2` selectors inside modular `styles/pages/*`
- Run `npm run css:report --workspace=@tragram/webapp` to regenerate CSS usage inventory.
- Run `npm run css:budget --workspace=@tragram/webapp` after build to enforce route CSS budgets.
