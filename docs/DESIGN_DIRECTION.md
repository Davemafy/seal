# SEAL design direction

## Core composition

SEAL is an evidence-reading tool, not a dashboard. The result starts with a two-object composition: the uploaded message as a large physical source object and the human decision beside it. Everything after that is a reading sequence: requested actions, contradictions, known-pattern evidence when present, safe route, full record.

## Hierarchy

1. Human decision / safe action.
2. Original message.
3. Requested actions.
4. Independent evidence.
5. Safe route.
6. Full verification record.
7. Technical record.

Claim counts never lead the experience.

## Type

Use a restrained sans stack for product text and Georgia only inside reproduced/source-document text where it helps distinguish source material. No decorative monospace layer. Uppercase is limited to real source text and short state labels such as MATCH / CONTRADICTS / COULD NOT VERIFY.

## Color

Warm neutral page, white document paper, near-black ink, a muted rust for contradiction, and a deep green for independent safe action. Color is semantic and sparse; text labels always accompany it.

## Document behavior

The document stays visually dominant on desktop. Exact bounding-box highlights are used only when token provenance provides coordinates. Pasted/demo text uses exact extracted source lines instead. No invented overlay geometry.

## Evidence behavior

Evidence is rendered as a vertical reading sequence, not equal cards. Each item names what the message says, what an independent source establishes, and why that matters. Official links are plain text links with no decorative arrow suffix.

## Mobile order

Decision → primary safe route → requested actions → document → evidence → safe route details → verification record → technical record.

## Interaction

Motion is limited to opacity/position transitions that clarify focus. No parallax, 3D, spring cards, cursor effects, fake AI thinking, or ambient decoration. Reduced-motion remains respected.

## What is deliberately removed

The previous signal-card grid, KPI-like review counts, 01/02 section labels, tiny uppercase chrome, decorative arrows, rounded-card nesting, and the fixed mobile evidence drawer.
