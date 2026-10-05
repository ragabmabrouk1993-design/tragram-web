# Webapp Dark Theme Audit Task List

Date: 2026-02-12

## Scope scanned

- Pages: 33 (`packages/webapp/src/app/**/page.tsx`)
- Layouts: 8 (`packages/webapp/src/app/**/layout.tsx`)
- Components: 80 (`packages/webapp/src/components/**/*.tsx`)
- App styles: 19 (`packages/webapp/src/app/styles/**/*.css`)

## Current baseline (already correct)

- Dark theme is forced at SSR: `packages/webapp/src/app/[lang]/layout.tsx:65`.
- Dark theme is forced at runtime/client hydration: `packages/webapp/src/providers/root-providers.tsx:18`, `packages/webapp/src/providers/root-providers.tsx:19`, `packages/webapp/src/providers/root-providers.tsx:20`.

## P0 - Must fix for dark-only policy

### 1) Remove all remaining light-theme CSS branches

Status: Done (2026-02-12)

Completed:

- Removed all `:root[data-theme='light']` blocks from:
  - `packages/webapp/src/app/styles/shared/tokens.css`
  - `packages/webapp/src/app/styles/shared/base.css`
  - `packages/webapp/src/app/styles/shared/utilities.css`
  - `packages/webapp/src/app/styles/pages/auth.css`
  - `packages/webapp/src/app/styles/pages/channels.css`
  - `packages/webapp/src/app/styles/pages/dashboard.css`
  - `packages/webapp/src/app/styles/pages/profile.css`
  - `packages/webapp/src/app/styles/pages/reports.css`
  - `packages/webapp/src/app/styles/pages/contact.css`
- Collapsed duplicated dark token definitions in `packages/webapp/src/app/styles/shared/tokens.css` by consolidating dark values into `:root` and removing `:root[data-theme='dark']`.

Validation:

- `rg -n ":root\\[data-theme='light'\\]"` on all files above returns no matches.

### 2) Remove light branches/defaults from shared themeable components

Status: Done (2026-02-12)

Files:

- `packages/webapp/src/components/i18n/language-switch.tsx:14`
- `packages/webapp/src/components/phone/phone-input.tsx:31`
- `packages/webapp/src/components/phone/country-select.tsx:23`
- `packages/webapp/src/components/auth/otp-input.tsx:18`
- `packages/webapp/src/components/auth/step-indicator.tsx:12`
- `packages/webapp/src/components/form/password-field.tsx:14`

Completed:

- Removed `light` from `tone` unions in the files above (dark-only contract).
- Removed all light-style class branches (`border-slate-*`, `bg-[#f2f5fb]`, `text-slate-*`) from these components.
- Kept compatibility with existing call sites passing `tone="dark"`.

### 3) Remove dead theme-toggle CSS and light-specific toggle override

Status: Done (2026-02-12)

File:

- `packages/webapp/src/app/styles/shared/utilities.css`

Completed:

- Removed `.theme-toggle*` CSS from `packages/webapp/src/app/styles/shared/utilities.css`.
- `rg -n "theme-toggle" packages/webapp/src/app/styles/shared/utilities.css` returns no matches.

## P1 - High-risk consistency areas

### 4) Legacy/Home2 route stack still carries mixed palette CSS (including white surfaces)

Status: Done (2026-02-12)

Imported by active layouts:

- `packages/webapp/src/app/[lang]/home2/layout.tsx:1`
- `packages/webapp/src/app/[lang]/home2/layout.tsx:8`
- `packages/webapp/src/app/[lang]/home2/layout.tsx:9`
- `packages/webapp/src/app/[lang]/(legacy)/layout.tsx:1`

Completed:

- Converted legacy/home2 large white content surfaces to dark tokenized surfaces in:
  - `packages/webapp/src/app/styles/legacy/core.css`
  - `packages/webapp/src/app/styles/legacy/home2-landing.css`
  - `packages/webapp/src/app/styles/legacy/legacy-pages.css`
- Updated legacy/home2 text-contrast rules for converted sections:
  - `contact-us-form` block in `packages/webapp/src/app/styles/legacy/core.css`
  - `appzen-not-found` error panel colors in `packages/webapp/src/app/styles/legacy/core.css`
  - `benefit-item-box-elite` and `pricing-item-header-elite` contrast overrides in `packages/webapp/src/app/styles/legacy/core.css`
  - language switch dropdown surfaces in `packages/webapp/src/app/styles/legacy/core.css`
- Converted legacy/home2 hover fills that used hard white card backgrounds to accent-based dark-compatible states in `packages/webapp/src/app/styles/legacy/home2-landing.css`.

Validation:

- No remaining `background: var(--white-color)` / `background-color: var(--white-color)` in:
  - `packages/webapp/src/app/styles/legacy/home2-landing.css`
  - `packages/webapp/src/app/styles/legacy/legacy-pages.css`
- Residual in `packages/webapp/src/app/styles/legacy/core.css` is limited to one intentional control knob fill:
  - `packages/webapp/src/app/styles/legacy/core.css:729`

### 5) Background-image theming is mostly hardcoded in legacy stack

Status: Done (2026-02-12)

Completed:

- Applied dark overlay layering on legacy/home2 image-backed sections so backgrounds remain dark regardless of source asset brightness:
  - `packages/webapp/src/app/styles/legacy/core.css`
  - `packages/webapp/src/app/styles/legacy/home2-landing.css`
  - `packages/webapp/src/app/styles/legacy/legacy-pages.css`
- Enforced Bootstrap dark palette usage in legacy/home2 route stacks by setting `data-bs-theme="dark"` at layout level:
  - `packages/webapp/src/app/[lang]/home2/layout.tsx`
  - `packages/webapp/src/app/[lang]/(legacy)/layout.tsx`
- Added Bootstrap token overrides for `html.appzen-home2` scope in `packages/webapp/src/app/styles/legacy/core.css` to avoid light fallback colors leaking into Bootstrap-driven elements.

Validation:

- Layout lint check passes after updates:
  - `npm --prefix packages/webapp run lint -- src/app/[lang]/home2/layout.tsx src/app/[lang]/(legacy)/layout.tsx`
- `rg` confirms dark Bootstrap mode is explicitly set in both legacy/home2 layouts.
- Remaining plain `background-image: url(...)` hits in scanned files are icon/mask assets (`arrow-primary.svg`, `benefit-image-3-mask-elite.svg`) and not page-surface theme backgrounds.

## P2 - Cleanup / regression prevention

### 6) Unused components still contain strong light-surface styles

Status: Done (2026-02-12)

Files reviewed:

- `packages/webapp/src/components/auth/auth-split-layout.tsx:86`
- `packages/webapp/src/components/auth/auth-layout.tsx:16`
- `packages/webapp/src/components/layout/header.tsx:16`
- `packages/webapp/src/components/layout/navbar.tsx:23`
- `packages/webapp/src/components/layout/footer.tsx:13`

Completed:

- Converted/re-validated the files above for dark-only readiness before reuse.
- Completed `auth-split-layout` dark conversion for left/right surfaces, text, cards, and controls.
- Replaced remaining exact light token in carousel dot active state:
  - `packages/webapp/src/components/auth/auth-split-layout.tsx` (`bg-white` -> `bg-primary`).

Validation:

- `rg -n "bg-white|text-slate-900|border-slate-200"` in the five files above returns no forbidden light-surface class usage.

### 7) Add guardrails to prevent light styles from re-entering

Status: Done (2026-02-12)

Completed:

- Added `packages/webapp/scripts/dark-theme-guardrails.cjs`.
- Added npm script: `packages/webapp/package.json` -> `theme:guardrails`.
- Implemented guardrails to fail when:
  - `:root[data-theme='light']` appears in active app styles.
  - `tone?: "dark" | "light"` (or reverse order) appears in shared UI components.
  - `tone = "light"` appears as a default.
  - forbidden light tokens appear in dark-only components (`bg-white`, `border-slate-200`, `text-slate-900`).
- Expanded dark-only component guardrail scope to include:
  - `packages/webapp/src/components/auth/auth-layout.tsx`
  - `packages/webapp/src/components/auth/auth-split-layout.tsx`
  - `packages/webapp/src/components/layout/header.tsx`
  - `packages/webapp/src/components/layout/navbar.tsx`
  - `packages/webapp/src/components/layout/footer.tsx`

Validation:

- `npm --prefix packages/webapp run theme:guardrails` passes.
- `npm --prefix packages/webapp run lint -- src/components/auth/auth-split-layout.tsx src/components/auth/auth-layout.tsx src/components/layout/header.tsx src/components/layout/navbar.tsx src/components/layout/footer.tsx scripts/dark-theme-guardrails.cjs` passes.

## Route coverage summary

### P0 cleanup completed for shared/page CSS light branches

- `packages/webapp/src/app/[lang]/auth/login/page.tsx`
- `packages/webapp/src/app/[lang]/auth/signup/page.tsx`
- `packages/webapp/src/app/[lang]/auth/forgot-password/page.tsx`
- `packages/webapp/src/app/[lang]/dashboard/page.tsx`
- `packages/webapp/src/app/[lang]/channels/page.tsx`
- `packages/webapp/src/app/[lang]/channels/[subscriptionId]/page.tsx`
- `packages/webapp/src/app/[lang]/channels/[subscriptionId]/settings/page.tsx`
- `packages/webapp/src/app/[lang]/reports/page.tsx`
- `packages/webapp/src/app/[lang]/profile/page.tsx`
- `packages/webapp/src/app/[lang]/profile/personal-data/page.tsx`
- `packages/webapp/src/app/[lang]/profile/notifications/page.tsx`
- `packages/webapp/src/app/[lang]/profile/subscription/page.tsx`
- `packages/webapp/src/app/[lang]/profile/security/page.tsx`
- `packages/webapp/src/app/[lang]/profile/security/change-password/page.tsx`
- `packages/webapp/src/app/[lang]/profile/security/delete-account/page.tsx`
- `packages/webapp/src/app/[lang]/profile/invoices/page.tsx`
- `packages/webapp/src/app/[lang]/profile/settings/page.tsx`
- `packages/webapp/src/app/[lang]/profile/language/page.tsx`
- `packages/webapp/src/app/[lang]/profile/logout/page.tsx`
- `packages/webapp/src/app/[lang]/profile/contact/page.tsx`

### Dark-only implementation currently looks aligned (static scan)

- `packages/webapp/src/app/[lang]/onboarding/page.tsx`
- `packages/webapp/src/app/[lang]/restricted/page.tsx`

### Legacy/Home2 stack updated; visual QA still required

- `packages/webapp/src/app/[lang]/home2/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/features/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/pricing/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/contact/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/about/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/faqs/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/privacy-policy/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/terms-of-service/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/refund-policy/page.tsx`
- `packages/webapp/src/app/[lang]/(legacy)/help-center/page.tsx`

## Component findings summary (theme-relevant)

### Updated in this pass (shared inputs/selectors)

- `packages/webapp/src/components/i18n/language-switch.tsx`
- `packages/webapp/src/components/phone/phone-input.tsx`
- `packages/webapp/src/components/phone/country-select.tsx`
- `packages/webapp/src/components/auth/otp-input.tsx`
- `packages/webapp/src/components/auth/step-indicator.tsx`

### Converted to dark-only safe state (currently unused)

- `packages/webapp/src/components/auth/auth-split-layout.tsx`
- `packages/webapp/src/components/auth/auth-layout.tsx`
- `packages/webapp/src/components/layout/header.tsx`
- `packages/webapp/src/components/layout/navbar.tsx`
- `packages/webapp/src/components/layout/footer.tsx`

### No immediate issue found in active modern components (static scan)

- Marketing components under `packages/webapp/src/components/marketing/**`
- Active auth flow components using `AuthFlowLayout` and explicit `tone="dark"` usage
- Profile/dashboard shells using tokenized dark surfaces and shared page CSS

## Notes

- This pass is a static code audit. Visual QA is still required after cleanup for contrast and readability validation across breakpoints.

## Follow-up (2026-02-12)

- Added a reusable CTA component for Home2/legacy action buttons:
  - `packages/webapp/src/components/ui/appzen-cta.tsx`
- Added centralized dark-theme CTA styles:
  - `packages/webapp/src/app/styles/legacy/core.css`
- Replaced all `btn-default`/`btn-highlighted` CTA usages in Home2/legacy TSX pages/components with `AppzenCta` (`primary`, `secondary`, `danger`) to keep action buttons consistent with the dark webapp theme.
