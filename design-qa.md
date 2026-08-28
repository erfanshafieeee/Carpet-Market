# Design QA

final result: passed

## Comparison setup

- Source visual truth: `Heritage-Gallery (1).html`
- Source screenshots:
  - `frontend/qa/source-market-desktop.png`
  - `frontend/qa/source-market-mobile.png`
  - `frontend/qa/source-detail-desktop.png`
  - `frontend/qa/source-admin-dashboard.png`
- Implementation screenshots:
  - `frontend/qa/implementation-market-desktop.png`
  - `frontend/qa/implementation-market-mobile.png`
  - `frontend/qa/implementation-detail-desktop.png`
  - `frontend/qa/implementation-admin-dashboard.png`
- Browser: Google Chrome headless, device scale factor `1`
- Desktop viewport and pixel dimensions: `1440 × 1000` CSS px and `1440 × 1000` image px
- Mobile viewport and pixel dimensions: `390 × 844` CSS px and `390 × 844` image px
- Density normalization: none required; source and implementation captures use the same viewport and `deviceScaleFactor=1`.
- States: Persian market at initial unfiltered state, Persian product detail, authenticated Persian admin dashboard.

## Full-view comparison evidence

- Market desktop: the header, typography hierarchy, centered search, RTL filter rail, sorting control, three-column product grid, imagery, price/status treatment, borders and paper/wine palette align with the source. Demo product order and counts differ intentionally because the implementation reads seeded database records.
- Market mobile: the two-column grid, filter/sort controls, mobile proportions, typography and product imagery align at `390px`; no overlap or hidden core control was found.
- Product detail: the RTL two-column layout, image scale, contact CTA, status, specifications card and store information preserve the source hierarchy and spacing.
- Admin dashboard: header/sidebar proportions, four metrics, inventory/funnel panels, tables, borders and semantic colors match the source structure. The source-only analytics demo toggle is intentionally absent because it is a prototype control outside the PRD.

## Focused-region comparison evidence

- Header and typography: the embedded Vazirmatn and Noto Naskh assets from the source are used directly; title, brand, body and numeric weights were checked in the desktop and admin captures.
- Filters and cards: rail width, dividers, price inputs, product crop, grid gaps, title truncation, price wine color and inventory states were checked in desktop and mobile captures.
- Detail conversion area: contact CTA, price/status visibility and specification grouping were checked against the source detail capture.
- Admin metrics and funnel: card padding, bar hierarchy, inventory rows, navigation order and action controls were checked against the source dashboard capture.

## Required fidelity surfaces

- Fonts and typography: passed. Source font files are reused; sizes, weights, line heights and RTL/LTR behavior retain the design hierarchy.
- Spacing and layout rhythm: passed. Main content width, grid tracks, responsive image ratios, panel gaps, radii and dividers match without actionable drift.
- Colors and visual tokens: passed. Paper, wine, ink, muted, sand and semantic status colors map to the source tokens.
- Image quality and asset fidelity: passed. Original WebP carpet assets are reused with the intended crop; no placeholder, CSS art or substitute illustration is present.
- Copy and content: passed. Product data is realistic seeded content; fixed Persian/English copy follows the PRD. English description remains absent when not supplied instead of falling back to Persian.
- Accessibility and behavior: passed for the checked route states. Visible focus styles, semantic form controls, keyboard-sized controls, reduced-motion handling and responsive layouts are present.

## Comparison history

### Iteration 1

- Finding `[P2]`: the initial implementation content region was about 30px narrower than the source and the product image ratio did not follow the source's desktop/mobile change.
- Fix: increased the market/detail frame to preserve the source's effective `1340px` content width and set product images to `.86` on desktop and `.79` on mobile.
- Post-fix evidence: `implementation-market-desktop.png` and `implementation-market-mobile.png` align with the corresponding source grid, card widths and image heights.

### Iteration 2

- Finding `[P2]`: the dashboard date selector and add button wrapped unnecessarily, and store/rate navigation order differed from the source.
- Fix: constrained the selector to `150px`, preserved horizontal action layout where space allows, and matched sidebar ordering. Funnel opacity progression was also aligned.
- Post-fix evidence: `implementation-admin-dashboard.png` matches the source dashboard hierarchy and navigation rhythm.

## Browser interaction and console checks

- Product cards rendered: `9`
- All visible market images loaded with non-zero natural size.
- Product detail navigation succeeded.
- Contact modal opened and exposed the phone CTA.
- Admin login succeeded with the local Demo account.
- Four dashboard metric cards rendered.
- Admin products table rendered `10` products.
- Console/runtime errors after implementation route checks: none.

## Residual accepted differences

- Seeded database values, product ordering and metric totals are intentionally different from the static prototype data.
- The prototype-only analytics source toggle is not implemented because it is not a production requirement.
- The narrow mobile brand crop visible in the source is retained for visual fidelity and does not cover the primary market controls.
