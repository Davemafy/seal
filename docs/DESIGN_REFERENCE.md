# SEAL reference index

The 50 links in this index were supplied as references. The notes below are **design hypotheses from their titles and the SEAL brief**, not findings from inspecting those canvases. The user subsequently supplied an inspectable duplicate of Base Gallery; its observed details are recorded below. The other Community listing IDs are not Figma design file keys.

Metadata screening of all 50 IDs is recorded in `UX_REFERENCE_STUDY.md`. The Base Gallery duplicate is [this Figma design](https://www.figma.com/design/44ILRjXYsYqh7uvqC131lu/?node-id=21969-376953). Its URL initially points to Date Elements; the relevant page is ❖ Base Components.

The product order remains document, decision, independent evidence, and safe route. The reference names below are prompts for comparison, not a visual audit.

## Inspected Base Gallery implementation

Source: Figma file `44ILRjXYsYqh7uvqC131lu`, page `❖ Base Components` (`3:4200`). Screenshots and design context were inspected for Light tokens → Core (`21149:262835`), Typography → Heading (`21149:267211`) and Paragraph (`21149:267227`), Button → Medium (`21149:269195`), Input → Text area (`21154:265672`), File drop (`21156:279679`), and Banner (`21151:253939`). Layout → Normal (`20615:223835`) establishes 4 columns at 320–599 with 16px margins/gutters, 8 columns at 600–1135 with 36px margins/gutters, and 12 columns at 1136+ with 64px margins and 36px gutters.

| Base role | Inspected value | SEAL use |
| --- | --- | --- |
| Background primary/secondary/tertiary | #FFFFFF / #F3F3F3 / #E8E8E8 | Canvas, document region, fields and secondary controls |
| Content primary/secondary/tertiary | #000000 / #4B4B4B / #5E5E5E | Reading hierarchy |
| Opaque border / selected border | #E8E8E8 / #000000 | List rows and selected details |
| Accent / negative / positive | #276EF1 / #DE1135 / #0E8345 | Focus and source check states |
| Medium button | 48px height, 16px horizontal padding, 16/20 medium label; rect primary black, secondary gray | Primary check, secondary action |
| Text area | 14/16 medium label, 8px gap, #E8E8E8 fill, 8px radius, 16px padding, 14/20 regular input | Message paste |
| File drop | #F3F3F3 fill, dashed border; blue drag state, rounded browse control | Upload |
| Heading | Uber Move Bold, 40/52 through 20/28 in inspected Heading sheet | Headings follow the scale |

The Figma file uses Uber Move and Uber Move Text. The user supplied `UberMoveMedium.otf` and `UberMoveBold.otf`, now self-hosted via `next/font/local`. These are Uber Move display weights, not the separate Uber Move Text family shown in Base's paragraph and label components; the available Medium face also serves regular text. Red/green verification states use Base's inspected semantic extensions. The original message, claims, source links, disclaimers, and verification logic remain SEAL data and behavior.

## Foundation

1. **Material 3 Design Kit** — Useful for state hierarchy and accessibility. Learn: a component state is legible because spacing, label position, and contrast are systematic. Avoid: Material color personality and dense component chrome.
2. **UI Prep Design System 7.0** — Useful for layout discipline. Learn: consistent grids and Auto Layout keep complex surfaces calm. Avoid: turning SEAL into a generic component gallery.
3. **Untitled UI** — Useful for density and component construction. Learn: restrained spacing and text hierarchy. Avoid: startup-dashboard composition, stacked cards, KPI rows.
4. **Base Gallery** — Selected by the user as SEAL's end-to-end UI system. See inspected notes below.
5. **MUI for Figma** — Useful for complex control states. Learn: interaction states are explicit, compact, and predictable. Avoid: Material styling and colorful variant grids.
6. **Figma Simple Design System** — Useful for responsive implementation realism. Learn: tokens and clear component boundaries. Avoid: demo-like component showcase layouts.
7. **Obra shadcn/ui** — Useful as a negative reference. Learn: why consistent primitives are useful. Avoid: the recognizable shadcn rhythm of bordered cards, pills, muted panels, and generic SaaS composition.
8. **Shadcn-style open-source system** — Useful for developer parity. Learn: accessible primitives can remain plain. Avoid: letting primitives define the page composition.
9. **Flowbite Design System** — Useful for realistic responsive states. Learn: dense interfaces need deliberate type and spacing. Avoid: dashboard chrome and blue SaaS defaults.
10. **Preline UI** — Useful for robust controls and form patterns. Learn: inputs can be quiet and obvious. Avoid: component-demo aesthetics.

## Composition / anti-dashboard

11. **Landify** — Useful for section rhythm. Learn: large compositional blocks need clear reading order. Avoid: marketing-section assembly and logo/feature grids.
12. **Cloud Solutions Landing Page** — Useful for asymmetric balance. Learn: image/object and text can carry unequal weight. Avoid: dark-gradient startup styling.
13. **Mac Agency** — Useful for deliberate whitespace. Learn: fewer objects can create stronger hierarchy. Avoid: portfolio decoration.
14. **AstroPaper** — Useful for content-first hierarchy. Learn: body copy, headings, and links can carry the interface without containers. Avoid: blog-specific motifs.
15. **Minimalist Brutalist Web Template** — Useful for breaking card reflexes. Learn: rules, type, and spacing can replace boxes. Avoid: brutalism as costume.
16. **New Brutalism Portfolio** — Useful for hard hierarchy. Learn: strong type can separate sections without extra UI. Avoid: novelty shadows, stickers, and playful geometry.
17. **Free Minimalist Web Template** — Useful for restraint. Learn: whitespace is functional when it separates decisions. Avoid: emptiness that slows task completion.
18. **Whitespace** — Useful for compositional breathing room. Learn: keep one dominant object per viewport. Avoid: oversized type for its own sake.
19. **VENCE Minimal Blog Design** — Useful for long-form reading. Learn: evidence can read like a document, not a dashboard. Avoid: editorial cosplay.
20. **MineMalist Blog Concept** — Useful for image/text rhythm. Learn: source material can be visually primary. Avoid: blog navigation patterns.

## Evidence storytelling

21. **Case Study Presentation Template** — Useful for sequencing. Learn: problem, evidence, and outcome should be revealed in a narrative order. Avoid: slide-deck styling.
22. **Visual Portfolio Template** — Useful for large visual surfaces. Learn: imagery can dominate while supporting text stays compact. Avoid: portfolio theatrics.
23. **Case Study Template [Community]** — Useful for problem → evidence → conclusion order. Avoid: pastel case-study styling.
24. **Case Study Template** — Useful for alternative narrative pacing. Learn: not every section needs identical framing. Avoid: decorative section numbering.
25. **UI/UX Case Study Template** — Useful for explaining reasoning. Learn: show source, interpretation, and outcome next to each other. Avoid: process-diagram clutter.
26. **Xoppin.k UX/UI Case Study** — Useful for pacing. Learn: one strong point per section. Avoid: resume/portfolio tropes.
27. **Case Study Template That Lands You the Job** — Useful for priority. Learn: lead with the decision and only then show process. Avoid: interview-deck tone.
28. **Case Study Elements** — Creator describes branded client-work sections for the Jellypepper site. Possible presentation pacing reference only; no evidence-specific interaction has been verified.
29. **UX Documentation Templates** — Useful for traceability. Learn: provenance can be detailed without dominating the reading path. Avoid: workshop-board visuals.
30. **Customer Journey Map** — Useful for decision path. Learn: the safe route is a sequence, not a CTA floating outside context. Avoid: sticky-note aesthetics.

## Dense evidence / record

31. **Charts & Infographics UI Kit** — Useful for compact comparative information. Learn: dense material needs consistent axes/labels and hierarchy. Avoid: decorative data-viz.
32. **Identify Leads Dashboard** — Useful only as a density reference. Learn: repeated rows can be compact. Avoid: dashboard shell, nav, KPI cards.
33. **Sales Dashboard** — Useful only for compact information grouping. Avoid: analytics visual language.
34. **Article App** — Creator describes an iOS/mobile design-system UI kit and their creation process. Do not use it as evidence for a long-form reading layout.
35. **Bulletproof Forms** — Useful for field states. Learn: validation belongs at the exact field, not as a global warning. Avoid: form-heavy composition.
36. **Omnichart** — Useful for relationships. Learn: source → claim → outcome needs explicit connection. Avoid: visible flowchart arrows as decoration.
37. **Grids** — Useful for discipline. Learn: use a repeatable desktop/tablet/mobile grid rather than arbitrary offsets. Avoid: showing the grid.
38. **User Flow Kit** — Useful for safe-path logic. Learn: each next step should have one obvious destination. Avoid: diagram styling.
39. **Ultimate Figma Project Setup + UXR Kit** — Useful for organizing evidence and annotations. Learn: separate raw evidence from synthesis. Avoid: research-repository UI.
40. **PowerApps UI Kit Lite** — Useful for dense app states. Learn: tables and form records can be compact and accessible. Avoid: enterprise visual language.

## Interaction / responsive / polish

41. **Carousel / Smart Animate Exploration** — Useful for motion principles. Learn: motion should preserve spatial continuity. Avoid: carousel behavior in SEAL.
42. **iOS & iPadOS 26** — Useful for progressive disclosure. Learn: controls appear when relevant and recede otherwise. Avoid: Apple mimicry.
43. **iOS 18 / iPadOS 18** — Useful for compact mobile hierarchy. Learn: mobile order is not desktop stacked. Avoid: native-app chrome on web.
44. **Material Dark Theme Design Kit** — Useful for contrast study. Learn: dark surfaces require disciplined tone separation. Avoid: dark mode as automatic "premium" styling.
45. **Tailwind CSS UI** — Useful for implementation-friendly spacing. Learn: consistent spacing scales survive responsive changes. Avoid: stock Tailwind look.
46. **Responsive Design for Development** — Useful for breakpoint behavior. Learn: content reorders, not just shrinks. Avoid: desktop-first stacking.
47. **Lo-fi Wireframe Kit** — Useful for hierarchy before polish. Learn: the core screen must work in grayscale. Avoid: wireframe aesthetics in production.
48. **Contra Wireframe Kit** — Useful for modern flow composition. Learn: make the primary action obvious without extra decoration. Avoid: kit personality.
49. **UpTicker Lite Wireframes** — Useful for alternative structure. Learn: layout should follow task sequence. Avoid: app-shell defaults.
50. **Vercel AI Elements** — Useful as a negative reference for category conventions. Learn: contemporary AI products foreground model interaction. SEAL should instead foreground the uploaded document and independent sources. Avoid: chat chrome, streaming AI theater, tool-call styling.

## Earlier reference hypotheses

### SEAL / upload
Chosen references: Bulletproof Forms, Simple Design System, Lo-fi Wireframe Kit, Contra Wireframe Kit.
Direction then: one calm intake surface. The selected Base Gallery file supersedes the earlier no-dropzone hypothesis with its file-drop component.

### SEAL / result
Chosen references: Whitespace, AstroPaper, Visual Portfolio Template, Minimalist Brutalist Web Template.
Direction: the source document is the largest object; the decision and safe route are the second-largest object. Rules and whitespace replace cards.

### SEAL / document inspection
Candidate references: VENCE and Material 3, pending actual frame inspection.
Direction: preserve readable source material, exact highlights where provenance supports them, and avoid invented spatial annotations.

### SEAL / evidence
Candidate reference: VENCE for reading, pending inspection. Base Gallery controls and tokens have now been inspected as recorded above. The listed case-study templates are portfolio or marketing resources rather than verified claim/evidence patterns.
Direction: each contradiction reads as claim → official source → explanation. Known-pattern evidence gets its own rhythm instead of a generic signal card.

### SEAL / safe action
Chosen references: Customer Journey Map, User Flow Kit, Contra Wireframe Kit.
Direction: a short sequence with one clear primary route and optional independently sourced contact.

### SEAL / full record
Chosen references: PowerApps UI Kit Lite, Bulletproof Forms, Charts & Infographics UI Kit.
Direction: dense, compact ledger with explicit state text; no giant result cards.

### SEAL / mobile
Chosen references: iOS/iPadOS 18 & 26, Responsive Design for Development, Simple Design System.
Direction: decision first, then safe action, then document and evidence. Desktop columns are not simply stacked.

## Anti-patterns removed

No decorative arrows on links, no numbered editorial section labels, no mono eyebrow on every section, no signal-card grid, no KPI row, no bento composition, no fake terminal language, no "AI-powered" chrome, and no authenticity score.
