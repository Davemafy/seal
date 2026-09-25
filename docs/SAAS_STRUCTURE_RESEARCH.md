# SEAL workspace structure — research and decisions

September 25, 2026. Scope: the entry and review journey, using Base Gallery's inspected control and color grammar. These are observations from published product/design material, followed by our application to SEAL; they are not claims that SEAL's rendered screens were visually tested.

## What we studied

| Source | Observed pattern | SEAL decision |
| --- | --- | --- |
| [Linear's UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | Sidebar, tabs, headers, and panels establish a consistent current view and available actions, with less navigation noise. | Keep a persistent desktop workspace rail, a contextual header, and compact section navigation during review. Show only real actions: new check and an example. |
| [Linear's 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh) | Structure is visible through alignment and selective separators rather than rules around everything. | Let the document and main result establish hierarchy. Use dividers for records and navigation rather than wrapping every statement in a card. |
| [Mercury's transaction view](https://mercury.com/blog/updated-transactions-page) | The product page helps users answer a concrete question from a detailed underlying record. | Keep the original message visible beside the summary; place source and claim details in an inspectable record rather than a generic dashboard. |
| [Stripe Radar review](https://docs.stripe.com/radar/reviews) | Reviewers inspect a flagged payment with its underlying signals before choosing an action. | Put the finding and the relevant original content together, then expose the reason and source behind each checked detail. Do not turn a source match into a numerical confidence score. |
| [VirusTotal reports](https://docs.virustotal.com/docs/results-reports) | Security analysis separates a report summary from inspectable details. | Let most readers start with the summary and next action; keep the complete evidence record available below for scrutiny. |
| [GOV.UK error guidance](https://design-system.service.gov.uk/components/error-message/) | Explain what went wrong and how to fix it. | Make unreadable-file and failed-check messages actionable without treating the user as careless. |
| [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/) | Showing captured data back to users gives them a chance to catch mistakes. | Keep exact extracted text and the document adjacent to checked results; do not hide the original after upload. |
| [Base Gallery duplicate](https://www.figma.com/design/44ILRjXYsYqh7uvqC131lu/?node-id=21969-376953) | Inspected white/gray semantic surfaces, black primary controls, file drop, text area, list rows, type scale, and 4/8/12-column breakpoints. | Continue using Base's component grammar for the new workspace structure. |

## Product decisions

1. **First action:** the entry view asks for a document or text. File upload, paste, and example each start a check in one action. The old upload → ready screen → check flow asked the user to confirm the same intent twice.
2. **Navigation:** the desktop rail is orientation, not a fake account product. No invented history, settings, team, analytics, or saved cases. A compact header replaces the landing-page hero after entry.
3. **Result hierarchy:** lead with what the available sources found, keep the original visible, then show a source-backed next step and the detailed claim ledger. The in-page links lead to actual sections.
4. **Voice:** describe what SEAL can do and what it found. State authenticity limits once in the relevant context. Keep warnings specific to the detected action instead of opening with a list of things the user should fear.
5. **Trust:** evidence excerpts, links, timestamps, and unsupported results remain visible. No authenticity score or implied legal ruling.

## Remaining verification

The code passes typecheck, lint, unit tests, and a production build. The current execution environment lacks a working local browser preview, and the Vercel deployment is protected. Desktop/mobile geometry and live interaction still need an actual browser visual pass before claiming visual polish or an improved UX score.
