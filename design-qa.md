# Design QA — full frontend parity

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
