# SEAL — LexHack judge packet

## Three lines to make memorable

1. **The seal can be faked. The source can’t.**
2. **No independent source, no MATCH.**
3. **The model can extract a claim. It cannot promote that claim to a verdict.**

## Rubric story

- **Impact (25):** a legal-looking message can contain real public details while steering someone toward an unsafe consequential action. SEAL intervenes before the person calls, clicks, pays, replies, or discloses information.
- **Technical execution (25):** the system distributes authority: artifact -> grounded claim/action -> independent resolver -> final evidence guard -> three-state verdict -> sourced safe action.
- **UX (20):** the user sees the original request, the independent evidence, the bounded conclusion, and a safer next route instead of a black-box scam score.
- **Innovation (15):** SEAL verifies the consequential action independently rather than authenticating the artifact from its appearance or repeating the sender’s claims.
- **Presentation (15):** Dallas gives a complete story in seconds: official-looking artifact -> QR payment instruction -> City of Dallas source -> rejected route -> underlying matter still unconfirmed.

## Evidence package

- City of Dallas published scam artifact as the flagship demo.
- 15-case checked-in engineering benchmark.
- 0 false MISMATCH in the benchmark.
- 0.933 full-flow benchmark success.
- 15/15 live action extraction-or-refusal stress gate.
- Dedicated unit tests for model/verdict separation and evidence-required decisive states.

These are engineering measurements, not real-world accuracy estimates.

## Screenshot order for Devpost

1. Dallas artifact beside SEAL’s bounded decision and source.
2. Evidence view showing the independent City of Dallas source and the exact requested action.
3. One architecture graphic using the five-stage pipeline; no dependency cloud.
4. Benchmark proof with the limitations statement visible.

## Claims to avoid

- “SEAL authenticates court notices.”
- “SEAL detects scams with X% accuracy.”
- “MATCH means the whole document is legitimate.”
- “MISMATCH means the underlying legal matter does not exist.”
- “The LLM determines the verdict.”
- “SEAL covers every court/jurisdiction.”

## Freeze rule

Do not add a feature unless it materially changes a judge’s confidence in Impact, Technical Execution, UX, Innovation, or Presentation **and** is visible in the demo/Devpost.

After CI is green and the Dallas path is reliable, freeze product surface. Remaining work is recording, screenshot selection, copy consistency, and submission QA.