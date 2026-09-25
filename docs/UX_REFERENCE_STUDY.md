# SEAL UX reference study — access and working audit

## Source status

The 50 user-supplied Figma Community URLs are a candidate library. A Community listing number is not a Figma design file key. Figma itself returned “Site Unavailable” in the accessible browser, and the Figma file API rejected the listing number. A public [Grida mirror](https://code.grida.co/community/file/1174812137272978612) exposed creator descriptions and tags for many of the exact IDs. All 50 IDs were checked there; some returned a server error. Its cover images did not load, and its canvas remained on a loading screen. **These are metadata findings, not visual design findings.** No canvas, frame, spacing, type scale, or mobile behavior from these files has been visually inspected.

The first designs to inspect visually when viewable design-file links or exported frames are available are:

| Reference | SEAL question to test |
| --- | --- |
| [Material 3 Design Kit](https://www.figma.com/community/file/1035203688168086460) | Inspect focus, disclosure, control states, and accessible density; do not borrow its product look. |
| [Base Gallery](https://www.figma.com/community/file/805195278314519508) | Inspect the consistency and accessibility of mature base controls. |
| [VENCE Minimal Blog Design](https://www.figma.com/community/file/1191668129102392941) | Test whether its reading measures and image/text balance help the document view. The metadata only says it is a blog design. |
| [Visual Portfolio Template](https://www.figma.com/community/file/877919752473077115) | Test its 12-column image/text hierarchy for the document and decision composition; avoid portfolio scale and theatrics. |
| [Contra Wireframe Kit](https://www.figma.com/community/file/833515051385038928) | Inspect mobile information order only. Its creator describes a 150+ component, 50+ screen starter kit, not a SEAL-specific flow. |

Inspect these first, then expand only to files that answer a remaining SEAL design question. Record specific visible frames and observations for each. Do not count opening a listing or reading its title as inspection.

## What the metadata screening changed

- [Article App](https://www.figma.com/community/file/1174812137272978612) is described by its creator as a **design-system/UI kit** and a look at their creation process, with iOS/mobile tags. The earlier claim that it is a content-heavy article-reading layout was unsupported. Remove it from the document-reading shortlist.
- [Case Study Elements](https://www.figma.com/community/file/1182331333206978506) comprises branded client-work sections used on the Jellypepper website. It may help presentation pacing, but it is not a claim/evidence interaction kit.
- [Case Study Presentation Template](https://www.figma.com/community/file/892528949344124083) is a light/dark portfolio presentation for students and professionals. It should not determine SEAL's result-screen hierarchy.
- [Bulletproof Forms](https://www.figma.com/community/file/1209089636584712632) advertises a paid resource with validation and accessibility guidance. The listing does not grant access to its full UI library. It remains a possible input-state reference if an actual preview is available.
- [Grids](https://www.figma.com/community/file/1206980514047045812) contains golden-ratio and rule-of-thirds grid variants, not evidence that SEAL should use a particular grid. [User Flow Kit](https://www.figma.com/community/file/830510773896272856) is explicitly a collection of arrows and flowchart cards. Neither should shape the production surface.
- [Charts & Infographics UI Kit](https://www.figma.com/community/file/855517047816771255) contains chart patterns including heatmaps and candlesticks. SEAL's claims are records, not numeric series. The two listed sales/lead dashboards emphasize KPIs. Drop them from the active shortlist.
- [Lo-fi Wireframe Kit](https://www.figma.com/community/file/887892609124245416) is a free demo of a paid kit. [UI Prep 7.0](https://www.figma.com/community/file/1209986153083335158) is a paid design system. Treat descriptions and partial previews as such.
- The mirror returned errors for several newer items, including Figma Simple Design System, the iOS 18/26 kits, Responsive Design for Development, PowerApps UI Kit Lite, and Vercel AI Elements. No inference about their visual quality follows from that error.

The screening found **no verified visual template for SEAL's central interaction**: an uploaded message, extracted request, independent contradiction, and safe route. The product behavior must set that composition. Reference files can refine controls, reading measure, density, and responsive decisions after their frames are visible.

## Current implementation: code-based audit

This section is grounded in `app/seal-app.tsx` and `app/workspace.css`, not in a visual comparison with Figma or fresh screenshots.

1. **Decision and source relationship.** The desktop result uses a document/decision grid, with the decision pane sticky. Mobile changes the grid order to decision then document. This meets the basic decision-first requirement, but the complete safe route and independent contact follow evidence later in the document. Check whether the top decision CTA conveys enough of the safe route before mobile users reach the uploaded document.
2. **Single requested action.** `.requested-actions` has a two-column layout and generous fixed section padding even when only one action exists. Inspect the one-action Connecticut state at desktop and mobile sizes for the empty-gallery feeling the user reported.
3. **Evidence rhythm.** `.source-signals` uses a 12-column grid, with most signals spanning six columns and every third spanning twelve. That position-based alternation does not follow evidence type or importance. Test a layout driven by actual signal content and source length.
4. **Typography.** `Instrument Sans` is loaded and applied to `.seal-app` by the later rule in `workspace.css`. `Source Serif 4` is applied to source excerpts and message lines. The stylesheet retains older Arial/Georgia declarations, which are overridden later; consolidate them during the next visual pass to make the type system easier to maintain.
5. **Remaining lines.** The revised sections remove major top borders, while the upload form, processing list, source document, safe steps, and verification ledger still use rules. Review each line in a screenshot; keep those that separate real records or preserve the document’s original structure.

## Verification boundary

Typecheck and production build passed on the prior branch state. A fresh screenshot run was attempted but could not start: Playwright's Chromium binary was absent and its download returned an invalid archive in this workspace. No visual claim should be made from that attempt.

## Next visual pass

For each inspected reference, capture the exact frame or exported image and record the pattern, where it helps SEAL, and what should not transfer. Then compare SEAL at 1440 × 1000, 1280 × 800, 1024 × 768, 390 × 844, and 360 × 800. Make changes in one coherent branch batch, run existing checks, and inspect screenshots before deployment.
