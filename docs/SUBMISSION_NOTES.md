# Final Devpost submission copy

## Project title

SEAL

## Short description

SEAL helps people verify suspicious court messages before they call, click, pay, or reply. It extracts the action a message asks the recipient to take, checks only what independent public sources can support, and clearly separates matches, conflicts, and facts it cannot verify.

## Problem

Court scams increasingly imitate the surface details people use as trust signals: court names, case numbers, hearing language, official-looking letterheads, phone numbers, and QR payment routes.

That creates a difficult problem for ordinary recipients. A message can contain some real public details and still direct the recipient toward an unsafe action. A normal summarizer can make this worse by restating the message's instructions without independently checking them.

The important question is not simply “does this look real?”

It is:

**What is this message asking me to do, what can an independent source establish, and what should remain unverified?**

## Solution

SEAL is an action-first court-message verification prototype.

A user can upload an image/PDF or paste a court-related message. SEAL:

1. reads the message locally where possible;
2. extracts atomic requested actions such as paying, calling, scanning a QR code, appearing, filing, replying, or sharing information;
3. grounds those actions back to exact source text;
4. checks covered claims against allowlisted public court/government sources and published scam guidance;
5. returns only three evidence states:
   - **MATCH**
   - **MISMATCH**
   - **COULD NOT VERIFY**
6. gives an independently sourced verification route when available.

SEAL deliberately avoids a single “scam probability” score. Suspicion, an unfamiliar number, missing data, or an OCR guess is not enough to produce a contradiction.

## Why this is different

SEAL does not treat the uploaded notice as its own proof, and it does not turn an LLM opinion into a verdict.

The original message stays visually connected to the requested action and the supporting source evidence. Pattern evidence and direct case verification are shown as different things.

That matters because a legitimate-looking document can contain a dangerous instruction, while a legitimate court document can contain QR codes, urgency, or payment language without being fraudulent.

## Demo cases

### Real scam artifact
**City of Dallas — published scam traffic notice**

The notice uses official-looking court language, a case number, a pay-or-appear choice, and a QR-code payment route. SEAL isolates the requested action and surfaces independent public warning evidence while keeping direct case confirmation separate.

### Legitimate contrast
**U.S. District Court for the District of Connecticut — sample jury summons**

SEAL can corroborate supported public details while juror-specific/private or historical details remain unverified. A MATCH never authenticates the whole document.

## Safety / reliability design

SEAL is designed to abstain.

- unreadable or low-confidence fields are withheld from decisive verification;
- unsupported jurisdictions remain **COULD NOT VERIFY**;
- live-source failures do not silently become decisive cached verdicts;
- model-extracted actions must be grounded in the source text;
- when the model provider is unavailable or rate-limited, SEAL degrades to conservative deterministic extraction instead of fabricating a result.

Current engineering gates:

- **15/15** cases in the live action extraction-or-refusal stress gate;
- **0 false MISMATCH** verdicts in the checked-in 15-case benchmark;
- benchmark full-flow success: **0.933**.

These are controlled engineering measurements, not real-world accuracy estimates.

## Privacy

The uploaded image/PDF binary stays in the browser. PDF.js and Tesseract.js handle document reading locally. Extracted text may be sent to the server and to Groq for structured extraction when configured. SEAL has no user account or document database.

## Tech stack

- Next.js / React / TypeScript
- GSAP
- PDF.js
- Tesseract.js
- Groq OpenAI-compatible API for structured extraction
- Zod
- Cheerio
- Cloudflare Workers
- public court/government sources and source snapshots
- Vitest / Playwright / GitHub Actions

## AI and third-party tool disclosure

AI-assisted development tools were used during implementation and iteration. Groq is used at runtime for structured extraction, but model output does not directly assign evidence verdicts. Verdict gates and source relationships are enforced in application code against allowlisted evidence.

The project uses public open-source libraries and public APIs/pages listed in the repository.

## Limits

SEAL does not determine legal validity, admissibility, enforceability, whether a person actually owes money, or whether a private summons is authentic. It is not affiliated with any court and does not provide legal advice.

Coverage is intentionally bounded by reviewed evidence adapters. When SEAL cannot establish something, the expected output is **COULD NOT VERIFY**, not a guess.

## Live links

Use the deployed Cloudflare URL as the primary live demo.

Repository: https://github.com/Davemafy/seal

## Final submission checklist

- public repository opens without authentication
- deployed Cloudflare URL opens in a fresh/private browser
- Dallas Browse → Run in SEAL path works
- Connecticut legitimate contrast works
- demo video is under 3 minutes
- screenshots show the real artifact and evidence result, not only the landing page
- tech stack and AI/tool usage are declared
- no unsupported accuracy, authenticity, or “scam detection” claim appears in title, video, screenshots, or Devpost copy
