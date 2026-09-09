# Design QA — V2 release parity

## V2 final verification

- Source visual truth: `PRD&DESIGN/V2/Design-v2.html`.
- Evidence: `frontend/qa/v2-design-parity/comparison/`; every canvas shows the source on the left and the implementation on the right.
- Viewports: desktop `1440 × 1000` and mobile `390 × 844`, DPR `1`.
- Coverage: 15 paired captures — Market, product detail, sell steps 1/2/3, success, admin login, both dashboard tabs, request list/detail, product list/form, Market mobile, and sell mobile.
- Browser result: 15 source captures, 15 implementation captures, 15 comparisons, and no console/runtime errors.
- Functional browser result: authenticated request list/detail/filter/status/history and both dashboard tabs passed against the local Django/MySQL stack.
- Accepted content-only difference: the implementation displays current local database images and metrics rather than the prototype fixtures; layout, crop, hierarchy, state styling, and responsive behavior were evaluated independently.
- Intentional product override: the prototype Demo-credential box remains absent from the implementation as explicitly requested.

### V2 resolved findings

- `[P1]` The initial sell page jumped past its hero, the workspace used a boxed legacy layout, and mobile inherited desktop grid sizing. Fixed initial focus/scroll behavior, aligned the 265px dark step rail and separate white form, and restored a single-column mobile layout.
- `[P1]` The Market sell banner lacked the prototype's wine outer frame and compact inner panel. Tokens, spacing, logo scale, typography, CTA, and mobile composition now match the final design cascade.
- `[P1]` Public/admin brand copy and root metadata still contained V1 naming. Updated to Shabestari Carpet / فرش شبستری and added an explicit device viewport.
- `[P2]` Product detail did not include the V2 public footer. Added the store-aware bilingual footer.
- Final re-capture found no remaining actionable `P0`, `P1`, or `P2` issue. Mobile diagnostics report no overflowing element, and browser errors are empty.

## V2 request-filter follow-up — 2026-09-09

- Source visual truth: `PRD&DESIGN/V2/Design-v2.html`, admin requests state with the request-time card.
- Rendered implementation: `frontend/qa/implementation-v2-admin-requests.png` at `1440 × 1000` CSS/image pixels, DPR `1`.
- Full-view comparison: `frontend/qa/v2-design-parity/comparison/10-admin-requests.png` at `2880 × 1000`; source is left and implementation is right.
- Focused-region comparison was unnecessary because the filter controls, labels, spacing, borders, and table header remain legible at the original comparison resolution.
- `[P1]` The implementation kept the time range inside the main toolbar and defaulted to 30 days. Fixed by matching the design's independent date-filter card and making `همه زمان‌ها` the first/default option in the frontend, backend API, reset action, and design prototype.
- Fonts/typography, spacing/layout rhythm, color tokens, icon fidelity, and Persian copy match the reference. Existing product imagery is unchanged and outside this filter-only scope.
- Interaction QA passed: default is `all`, option order is `all/7/30/90/custom`, custom reveals the Jalali picker, results load, and browser console errors are empty.
- Post-fix comparison has no remaining actionable `P0`, `P1`, or `P2` finding.

## Archived V1 comparison

## Comparison setup

- Source visual truth: `Heritage-Gallery (1).html` (the revised local design prototype).
- Evidence: `frontend/qa/design-parity/comparison/`; every canvas shows the source on the left and the implementation on the right.
- Desktop viewport/capture: `1440 × 1000` CSS/image pixels, DPR `1`.
- Mobile viewport/capture: `390 × 844` CSS/image pixels, DPR `1`.
- States: Persian public market, product detail, unauthenticated admin login, and authenticated admin routes.
- Browser/runtime result: 10 source captures, 10 implementation captures, and no console/runtime errors.

## Screen-by-screen evidence

| Screen | Evidence | Result |
| --- | --- | --- |
| Market — desktop | `comparison/01-market-desktop.png` | Passed: header, search/filter rail, sorting, grid, cards, spacing, tokens, and RTL hierarchy align. |
| Product detail | `comparison/02-product-detail.png` | Passed: gallery/detail split, CTA, price/status, specifications, and store hierarchy align. |
| Admin login | `comparison/03-admin-login.png` | Passed: empty RTL inputs, mobile hint, reveal control, CTA, and removal of the Demo panel align. |
| Admin dashboard | `comparison/04-admin-dashboard.png` | Passed: sidebar/header, metrics, inventory, funnel, tables, and responsive rhythm align. |
| Admin products | `comparison/05-admin-products.png` | Passed: separate view/contact columns, linked edit price, actions, table density, and explanatory notice align. |
| Product form | `comparison/06-admin-product-form.png` | Passed: sections, bilingual hints, calculated area, upload guidance, previews, and five-column image grid align. |
| Exchange rate | `comparison/07-admin-exchange-rate.png` | Passed: production-safe unconfigured-provider state replaces prototype fake USD data in both artifacts. |
| Store settings | `comparison/08-admin-store.png` | Passed: English name, bilingual city/address, phone, layout, and control styling align. |
| Market — mobile | `comparison/09-market-mobile.png` | Passed: two-column cards, controls, image proportions, and core content remain visible at 390px. |
| Change password | `comparison/10-admin-change-password.png` | Passed: the product-only route was added to the design prototype and aligned with the implementation. |

## Required fidelity surfaces

- Typography: passed; Vazirmatn/Noto Naskh hierarchy, sizes, weights, line heights, and RTL/LTR behavior are consistent.
- Layout and spacing: passed; shared frames, columns, panel gaps, padding, dividers, radii, image ratios, and mobile behavior have no actionable drift.
- Colors and tokens: passed; paper, wine, ink, muted, sand, borders, and semantic states match.
- Images and assets: passed for presentation quality, sizing, crop, and loading behavior. See the accepted content difference below.
- Copy and behavior: passed; shared Persian/English labels align, optional English description remains hidden when absent, and production-only constraints were brought back into the prototype.
- Accessibility: passed for checked states; semantic controls, visible focus, keyboard-sized targets, labels, and responsive layouts remain intact.

## Comparison history

### Iteration 1

- `[P1]` Login still exposed prototype Demo credentials; product statistics were merged; the form lacked design guidance and image-grid fidelity; rate/store states diverged; and change-password was absent from the prototype.
- Fix: aligned login, split product statistics, added field/upload guidance and area preview, changed the preview grid, aligned rate/store content, and added the production change-password flow to the design.

### Iteration 2

- `[P2]` Two prototype navigation icons referenced unavailable icon names, and the change-password CTA width differed.
- Fix: mapped the icons to valid design assets and aligned the CTA width.

### Iteration 3

- Full re-capture of all ten states found no remaining `P0`, `P1`, or `P2` visual/interaction issues.
- Multi-image interaction QA passed: sequential selection retains both previews, exactly one pending cover can be selected, and the second image can become cover.
- Jalali date-picker interaction QA passed: 42 calendar day controls rendered and both selected date fields populated.
- Frontend typecheck, lint, and production build passed with zero errors; all 7 Django tests passed; browser console errors: none.

## Accepted non-UI differences

- The implementation reads the current database, whose first records include user/test uploads rather than the prototype carpet photos. Image subject and product/metric values therefore differ, while crop, loading, layout, and responsive presentation match. Database content was not overwritten during a frontend parity pass.
- A few static remote image references in the standalone prototype are unavailable in the isolated browser profile. This is source-data availability, not an implementation regression.

final result: passed
