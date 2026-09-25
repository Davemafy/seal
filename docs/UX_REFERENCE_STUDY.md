# SEAL UX reference study — access and working audit

## Source status

The 50 user-supplied Figma Community URLs are a candidate library. A Community listing number is not a Figma design file key. The first priority listing, [Article App](https://www.figma.com/community/file/1174812137272978612), returned “Site Unavailable” in the accessible browser, and the Figma file API rejected its listing number. The page reader could not open the Community pages. No canvas, frame, spacing, type scale, or mobile behavior from these files has been visually inspected. Do not convert the title-level hypotheses in `DESIGN_REFERENCE.md` into attributed findings.

The first designs to inspect when viewable design-file links or exported frames are available are:

| Reference | SEAL question to test |
| --- | --- |
| [Article App](https://www.figma.com/community/file/1174812137272978612) | How can long source text stay readable beside navigation and annotations? |
| [Case Study Elements](https://www.figma.com/community/file/1182331333206978506) | How can evidence types differ without becoming identical cards? |
| [Case Study Presentation Template](https://www.figma.com/community/file/892528949344124083) | How can source, conflict, and safe action form a clear reading sequence? |
| [Bulletproof Forms](https://www.figma.com/community/file/1209089636584712632) | How should missing, uncertain, and invalid fields be explained at the source? |
| [Responsive Design for Development](https://www.figma.com/community/file/1230850200547605128) | Which content should reorder on mobile rather than stack? |
| [Contra Wireframe Kit](https://www.figma.com/community/file/833515051385038928) | Can the primary decision remain obvious without a dashboard shell? |

Inspect these first, then expand only to files that answer a remaining SEAL design question. Record specific visible frames and observations for each. Do not count opening a listing or reading its title as inspection.

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
