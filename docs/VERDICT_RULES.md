# Verdict law

## Judge-facing invariant

**No independent source, no MATCH.**

The stronger implementation rule is:

> **The model may propose what to check. Only resolver evidence may produce MATCH or MISMATCH.**

SEAL never treats matching details inside the artifact as proof that the sender or requested action is legitimate.

## Authority boundary

Every checked claim has exactly one state:

- **MATCH** — an independent reviewed source supports the claim.
- **MISMATCH** — an independent reviewed source directly contradicts the claim.
- **COULD_NOT_VERIFY** — the available evidence is missing, incomplete, conflicting, private, unreadable, or outside reviewed coverage.

The runtime extraction schema contains no verdict field. Model output can structure claims and requested actions, but it cannot assign MATCH or MISMATCH.

`lib/resolver.ts` enforces the decisive-result boundary in two places:

1. `verdict(...)` refuses to construct MATCH or MISMATCH without evidence.
2. `assertVerdictBoundary(...)` re-checks the final merged result set after resolver and public-intelligence layers have run.

That second guard prevents a future resolver or merge path from silently bypassing the rule.

## Conservative cases

- A failed source lookup is not contradiction.
- A missing public record is not proof that a private case is false.
- Private juror identifiers and reporting dates require direct confirmation.
- An OCR guess is withheld from decisive verification.
- Conflicting official sources remain COULD_NOT_VERIFY with both excerpts preserved.
- A phone is contradicted only when the notice presents it as the relevant official number and comparable official evidence exists.
- A domain is contradicted only when the notice presents it as the official route and outside evidence establishes a conflict.

Riverside’s published jury warning supports a MISMATCH for covered jury-related call/text payment demands. It does not establish a blanket rule for every paper notice. The known Desert Region number disagreement remains deliberately unresolved.

## What SEAL does not conclude

SEAL does not authenticate a sender, declare a whole document legally valid, determine whether a person owes money, or turn a warning pattern into direct case verification.

The verdict is claim-scoped. A single artifact can contain MATCH, MISMATCH, and COULD_NOT_VERIFY results at the same time.