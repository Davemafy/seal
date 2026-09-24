# SEAL

**The seal can be faked. The source can’t.**

Someone sends you a court notice. SEAL checks the claims with independently published court sources before you act. A plausible document can borrow accurate court details while introducing a different contact or payment demand. SEAL checks the details separately.

## Three verdicts

- **MATCH**: an official source positively confirms the exact atomic claim.
- **MISMATCH**: an official source directly contradicts the exact atomic claim.
- **COULD_NOT_VERIFY**: private data, missing records, source failure, ambiguous language, unsupported court, or disagreement among official sources.

SEAL does not determine authenticity, admissibility, enforceability, or legal validity. It independently checks specific claims against supported authoritative sources. The demo is fictional and uses no real court seal. SEAL is not affiliated with any court.

## Try it

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/demo`. The deterministic demo requires no key. Click **Run verification**; later **Check live sources** fetches Riverside pages. The landing page accepts PDF, JPG, and PNG. The original binary is read only in the browser. PDF text is extracted with PDF.js; scanned PDFs and images use lazily loaded Tesseract.js. If extraction is too uncertain, SEAL abstains rather than supplying guessed facts. The demo source snapshot is dated and identified as such.

Set optional variables from `.env.example`: `GROQ_API_KEY` for model claim structuring; `GROQ_BASE_URL` (default `https://api.groq.com/openai/v1`); `GROQ_MODEL` (default `openai/gpt-oss-20b`); `COURTLISTENER_TOKEN` for secondary federal docket search. Without the keys, local extraction and Riverside remain usable.

Your file stays in the browser. Extracted text can be sent to the SEAL server and, when configured, to Groq for claim structuring. The server does not store files or extracted claims. There is no database, account, or content analytics. The server fetches a fixed allowlist of official Riverside paths; it never fetches a URL printed on a notice.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run benchmark
npm run e2e
npm run build
```

Tests use saved court excerpts and avoid live dependencies. The current benchmark uses fictional fixtures and a degraded-text proxy; it is not a measurement on genuine summons photos. Live checks can fail or change; when they fail, results abstain. CourtListener is an index, so no result never means contradiction. Riverside official pages currently disagree about the Desert Region jury number, and SEAL shows both rather than choosing one. The 2026 payment warning expressly addresses calls and texts; paper payment demands without matching direct evidence remain unverified.

Architecture and verdict rules are in `docs/`. Further court coverage requires reviewed resolvers and source-specific contradiction rules. Related prior art includes court scam alerts and legal citation checking tools; SEAL’s distinctive workflow connects claims printed in a notice to independently sourced, conservative verdicts.
