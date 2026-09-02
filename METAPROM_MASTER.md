# METAPROM MASTER

The definitive operating manual for Metaprom — product vision, philosophy, architecture, and current state.

---

## Current State

**Canonical date:** September 2, 2026 (session close).

**Governing records:**

* **MASTER UPDATE — Session Close (September 2, 2026)** — **current operating truth.** Production baseline `655dcc1`, NewUserHandoff rebuild, zero-cost Preview fixture, anonymous generation health, failed anonymous Share rollback (`bdfc489`), dormant `share_slug` infrastructure, Google Handoff production validation, universal email auth P0, Premium Delivery pending acceptance, engineering doctrine, next-session priorities. **Supersedes** earlier **Current State** and **NEXT SESSION START HERE** where they conflict — especially August 18–20, 2026 GTM launch-hardening as the active execution compass, Share as undifferentiated launch P0, production commit `078da054`, and any implication the full New User Journey is closed.
* **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** — historical strategic phase record. Stripe Live, product positioning, Commercial Rescue / Inspector philosophy remain valid context. **Superseded** for active execution order and Share status by September 2, 2026 session close.
* **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** — results-not-generations philosophy, Correction vs Exploration, preferred future Preview funnel, rejected Motion Preview, Preview Pro same-project credit concept. Does **not** change LIVE Studio, current teaser/preview behavior, Stripe, or prices. Storyboard / Preview Pro / refunds / duration changes are **not live** and must **not** be implemented from that record.
* **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)** — Veo 3.1 Fast working minimum of **4 seconds**, customer-facing Preview target of approximately **1–1.5 seconds**, deliberate trim, Preview = proof/WOW vs Premium = finished product, and Preview/Premium differentiation as a **LAUNCH PRODUCT GATE**. Production-account cost remains **unverified**. Does **not** implement anything.
* **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)** — published customer guarantee for Premium Commercials. Still in force. Does **not** start GTM #6.

### Status legend

| Label | Meaning |
| --- | --- |
| **Production truth** | Deployed at current production commit |
| **Personally production-validated** | Roberto confirmed in real production |
| **Locally/test validated** | Passed local dev, fixture, or automated tests — not necessarily production E2E |
| **Rolled back / failed** | Attempted, reverted — do not restore without investigation |
| **Dormant infrastructure** | Applied but unused by application code |
| **Open / pending** | Not validated or not implemented |

### Current production baseline

| Field | Value |
| --- | --- |
| **Commit** | `655dcc1b2c25756e7102f4e2ef9d54dd18a56dfd` (short: `655dcc1`) |
| **Message** | `feat: rebuild new user handoff with preview fixture` |
| **Deployment** | `dpl_4Ba3MSXYhg6v4Y2MwF8jU5qX3dkF` — **READY** |
| **URL** | https://www.metaprom.com |
| **Previous known-good rollback baseline** | `c58285a47ef5368bc61091bfba1e1be763e65a78` (short: `c58285a`) |

Release `c58285a` → `655dcc1` contained exactly **one** application commit.

**Release validation (locally/test):** 76/76 relevant tests PASS. Vercel Production build/deployment READY.

**Known unrelated local-only issue:** `tmp-caroline-smith-qa/run-hero-still.mts` scratch TypeScript error during local `next build`. **Not** a production application failure.

### Personally production-validated (September 2, 2026)

* **Anonymous generation → Preview** — healthy. Real mobile anonymous generation reached Preview after `655dcc1` release. Historical 96% stall fixed at `58689be`; mobile Preview UX at `8b7281b`. Failed anonymous Share (`bdfc489`) was rolled back; anonymous generation confirmed healthy again post-rollback and post-handoff release. **Do not reopen or modify this path without concrete evidence.**
* **Google NewUserHandoff** — **PASS**. Roberto: anonymous visitor → Studio → real commercial generation → Preview → single tap “Guardar mi comercial” → Google auth → return → **same** commercial in Biblioteca. Immediate visible feedback; no stubborn/unresponsive save button while draft persistence occurs.

### Locally/test validated (not inferred as full production E2E)

* **Zero-cost Preview handoff fixture** — `http://localhost:3000/studio?ux4aReview=1` (requires `?ux4aReview=1` **and** loopback/development conditions; cannot activate for normal production users). Coffee commercial assets. Preview → Guardar → Google auth → Biblioteca **PASS** locally. Does **not** call commercial generation, image generation, OpenAI, Veo, Premium fulfillment, or credit consumption. Permanent development/testing tool for post-generation UX iteration.
* **NewUserHandoff intermediate states** — “Preparando tu comercial...” → “Abriendo Google...”; one tap sufficient; duplicate taps blocked; draft/auth/claim contracts preserved; no second generation; same anonymous creation claimed into authenticated account.

### Rolled back / failed — do not restore blindly

* **`bdfc489`** — `feat: share anonymous commercial previews`. First real production acceptance test immediately regressed anonymous generation to the 96% stall. Per Metaprom guardrail: **not** debugged forward. Reverted: `5d12806` (`git revert bdfc489`); `c58285a` retained only additive dormant `studio_drafts.share_slug` migration. **Anonymous Share remains OFF.** Before reimplementing, perform read-only root-cause investigation of which `bdfc489` change reintroduced the regression. Use the zero-cost fixture for almost all Share development/testing.

### Dormant infrastructure

* **`studio_drafts.share_slug`** — migration `supabase/migrations/20260902120000_studio_drafts_share_slug.sql` applied. Nullable column + partial unique index. **Application code does not use it.** Compatible with production. Do not remove merely because Share is OFF. Do not activate until evidence-based, isolated Share implementation.

### Open / not closed

* **Full New User Journey** — **NOT closed.** Google Handoff: production-validated / PASS. **Universal account access (email auth): OPEN / P0.** Current auth offers Google only — real customer-entry barrier. Desired: “Guardar mi comercial” → Continuar con Google **OR** Continuar con correo electrónico (Outlook, Hotmail, Yahoo, corporate email, etc.). Investigate Supabase email OTP / magic-link. Core contract unchanged: anonymous creation → Preview → Guardar → authenticate → **same** creation in Biblioteca.
* **Anonymous Preview Share / WhatsApp** — **OFF** pending safe reimplementation (P1).
* **Premium Delivery UX** — implemented/deployed at `7a2e85f` (dedicated finished-commercial surface: “¡Tu comercial está listo!”, HD video, Ver en mi Biblioteca, Descargar comercial HD, Crear otro comercial). **Final dedicated Premium Delivery acceptance remains pending** unless a later explicit real production test proves otherwise. Premium **processing** UX personally validated at `ed76f5f` (Director + progress bar).
* **Stripe annual packages** — future work (P4). Verify current Veo unit economics first; do not use old Kling assumptions.

### Closed production baselines — do not touch absent concrete evidence

* **Director V2** — CLOSED / production baseline. Key commits: `c5c0b68`, `e3a43b2`, `eeab107`, `8eb78a1`, `f610f94`, `d14431f`. V1 frozen rollback path. Generation firewall remains core architectural guardrail.
* **Premium FFmpeg audio-only bug** — fixed at `53b5727` (FFmpeg 7.0.2 Linux + scale2ref + single-frame PNG overlay produced zero filtered video frames; fix: `-loop 1` promotional overlay input). Roberto personally generated complete Premium afterward. CLOSED unless evidence recurs.

### Product funnel contract (current desired)

| Action | Anonymous allowed? |
| --- | --- |
| Generate | Yes |
| Watch/Replay Preview | Yes |
| Share | **Desired yes — currently OFF** |
| Save to Biblioteca | Registration/auth required |
| Create another | Registration/auth gate candidate |
| Premium | Registration/auth required |

Save value proposition: *“¿Te gustó tu creación? Guárdala.”* / *“Regístrate gratis y conserva este comercial y todo lo que generes próximamente en tu Biblioteca.”* — CTA: **“Guardar mi comercial”**. Registration must preserve the exact anonymous creation — never force regenerate after sign-in.

### Engineering doctrine — REBUILD OVER REPAIR

When a critical component has structural failure or successive patches: stop repairing architecture that has lost trust; freeze the healthy system; identify the component boundary; rebuild only the broken component in parallel; preserve healthy server/contracts/downstream systems; turn previous failures into tests; switch only after evidence.

But: **do not** indiscriminately rewrite healthy systems. If architecture/contracts are healthy and pieces are merely disconnected: **WIRE, NO REBUILD.** For localized bugs with proven root cause: **MICROFIX.** For risky production regressions: **REVERT FIRST** to known-good — do not debug forward while customers are exposed.

NewUserHandoff rebuild (`655dcc1`) is the successful exemplar: healthy auth/claim contracts preserved, fragile client orchestration rebuilt, fixture created, local validation, isolated production release, real mobile production acceptance PASS.

### Central product philosophy (preserved)

Metaprom should not make the customer learn AI or become “the glue” between image tools, video tools, voice tools, editing tools, prompting, and model selection. Metaprom delivers the finished advertising outcome.

> Las herramientas de IA generan partes. Metaprom entrega el resultado.

Core transformation: customer says what they need to sell → Metaprom understands → produces finished advertising asset → customer publishes/shares it. Preview belongs to Metaprom. Premium belongs to the customer. Creation → Distribution → Audience → Platform.

---

### Project Status — GO-TO-MARKET TRANSITION

Metaprom is moving from prolonged **BUILD / Product Development** toward **GO TO MARKET**.

The product will never be “perfect” before launch.

**New operating loop:**

```
BUILD → SELL → OBSERVE → IMPROVE
```

Not:

```
BUILD → BUILD → BUILD → BUILD
```

**Objective now:** a minimum commercially launchable Metaprom — not a theoretically complete Metaprom.

**Pre-launch rule:** **NO NEW FEATURE WITHOUT LAUNCH JUSTIFICATION.**

Until public launch, a new feature enters the critical path only if it materially affects the customer's ability to:

```
UNDERSTAND → BUY → PRODUCE → RECEIVE → USE / SHARE
```

Everything else goes to the post-launch backlog.

**Public launch planning target:** Monday, **September 7, 2026**. This is a planning target, not an immutable promise. The calendar may move if a genuine P0 remains unresolved. Do not move it merely because non-critical polish remains.

### Official Product Definition

**METAPROM IS NOT PRIMARILY AN AI GENERATION TOOL.**

Metaprom is an **AI-powered advertising production platform / advertising factory**.

| Tool | Factory |
| --- | --- |
| Generation | Production |
| User operates capabilities | Metaprom manages production toward a finished advertising asset |
| Models are the product | Models are production machinery |

**THE MODELS ARE NOT THE PRODUCT.**

**THE DELIVERED ADVERTISING ASSET IS THE PRODUCT.**

The customer should not need to become a prompt engineer, AI model expert, video editor, audio engineer, production supervisor, or format expert. The customer explains what they need. Metaprom handles the production complexity.

Official slogan — preserved, and now understood as aligned with this philosophy:

> Escribe lo que imaginas. Metaprom entiende el resto.

### Official Product Principles

> **METAPROM DOES NOT SELL GENERATIONS. METAPROM SELLS RESULTS.**
> **METAPROM NO VENDE GENERACIONES. VENDE RESULTADOS.**

A customer purchasing a Commercial buys a finished professional commercial they are satisfied with — not one Veo generation, one attempt, retries, compute, tokens, or an AI lottery ticket. Internal generation cost, repair, regeneration, Commercial Rescue, and escalation are Metaprom production concerns. Canonical commercial philosophy: **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**. For Premium Commercials, the customer-facing guarantee is now **published** in **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)**. This is not a change to live Studio, Stripe, or prices.

> Preview belongs to Metaprom.
> Premium belongs to the customer.

> No barriers, no nonsense.

> Producto exacto. Mensaje exacto. Creatividad libre alrededor.

Do not make the user learn Metaprom's internal architecture. The Director (now understood as **Production Director**) determines what the customer is trying to create and coordinates production, purchase, and delivery.

### Preview architecture — documented direction, not live

**LIVE:** current Studio flow and current teaser/preview behavior are unchanged.

**APPROVED PRODUCT DIRECTION (not implemented):** PHOTO / CUSTOMER ASSET → CREATIVE DIRECTOR → STORYBOARD / CREATIVE APPROVAL → AI VIDEO PREVIEW → PREMIUM COMMERCIAL → BIBLIOTECA → DOWNLOAD / SHARE.

**REJECTED EXPERIMENT:** deterministic Motion Preview as a funnel stage.

**WORKING TECHNICAL FINDING (not live):** Veo 3.1 Fast native generation minimum = **4 seconds**. Do not assume native 1s / 1.5s / 2s Veo generation is available.

**APPROVED UX DIRECTION, REQUIRES TESTING (not live):** expose approximately **1–1.5 seconds** (maximum target ~2 seconds if testing requires it); generate 4s source → deterministically trim to one immediate proof action; Preview = proof/WOW, not a mini-commercial. **Restrict narrative quantity, not quality.**

**LAUNCH PRODUCT GATE:** Preview/Premium differentiation must be established and validated before broad paid acquisition / serious public sales push. Storyboard, Preview Pro, and project-credit accounting are **not** automatically launch-blocking.

**STILL OPEN:** actual production-account billing/cost; final free Preview allowance; Preview Pro price / model / duration; exact same-project credit accounting; abuse protection; Storyboard implementation; correction/rework operational limits. The Premium Commercial delivery-failure refund guarantee is **no longer unpublished philosophy**; it is a published customer guarantee as of **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)**. That guarantee does **not** create unlimited revisions or refund-for-any-reason rights.

Do **not** implement Storyboard, Preview Pro, Motion Preview, refunds, duration changes, trimming, or Preview prompt changes from this Current State note. Canonical records: **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Next execution remains the GTM launch checklist. Stop the product-architecture detour.

### Stripe Live — Operational (August 18, 2026)

Stripe **Live Mode is enabled** and has processed real production payments.

Historical Test Mode E2E on www.metaprom.com remains valid evidence of the Commercial package path. It is **not** the current operating mode.

**Canonical production webhook URL:**

`https://www.metaprom.com/api/payments/webhook`

Do **not** configure Stripe Live to the apex URL while apex redirects to www.

**Stripe Live webhook 307 incident:** **RESOLVED** (August 18, 2026). Root cause was Stripe Live destination URL using apex `https://metaprom.com/api/payments/webhook`, which 307-redirected to www. Stripe requires 2xx and did not treat the redirect as successful. The webhook application handler was **not** the root cause. Fix: Dashboard-only edit of existing destination “Metaprom Production” to the www URL. Signing secret, events, application code, Vercel, and production env were preserved. No code deployment was required.

**Purchase #34 (`assets_10`, MXN $99, 10 Advertising Images):** **RESOLVED.** Async Live event `checkout.session.async_payment_succeeded` failed historically with HTTP 307. After endpoint correction, the event was resent August 18, 2026 ~23:19 CST → Delivered, HTTP 200, `ok: true`, purchase `completed`, `pending_webhooks: 0`. Advertising Image balance **5 → 15** (exactly +10). No manual credit grant. This is evidence that the normal async Stripe fulfillment path works when the webhook reaches the canonical www endpoint.

**Purchase #35 / MXN $180 Commercial** had previously been fulfilled exactly once through the return/polling path and must remain idempotent.

Package ladder (unchanged unless separately changed):

| Package | Price |
| --- | --- |
| 1 Commercial | MXN $180 |
| 5 Commercials | MXN $640 |
| 10 Commercials | MXN $990 |
| 20 Commercials | MXN $1,780 |
| 10 Advertising Images | MXN $99 |
| 25 Advertising Images | MXN $199 |
| 50 Advertising Images | MXN $349 |
| 100 Advertising Images | MXN $599 |

Do **not** lower the $180 Commercial launch price preemptively. Validate through real conversion after launch / soft launch.

Pricing must speak the language of **results** (`1 Commercial`, `10 Advertising Images`), not compute (generations, tokens, model credits). Internal retries/repairs are production cost.

### Dual Creation — Foundation, Not the Next BUILD Sprint

Dual Creation Architecture (Commercials + Advertising Images, Director as entry point) is the **current dual-product foundation**, not the active next BUILD sprint.

Advertising Image packages, entitlements, and Live fulfillment are operational. Purchase #34 credited 10 Advertising Images through the normal webhook path.

Unknown-customer E2E of both journeys remains a **launch-readiness audit** item (GTM Lane A). Do not claim a CEO Product Review PASS of the full unknown-customer Advertising Image journey unless separately recorded. Do not treat Dual Creation as a reason to remain in BUILD-only mode.

### Share — Anonymous OFF; Biblioteca infrastructure exists

RC1 built a **functional Share foundation** for authenticated Biblioteca assets (public Preview pages, share controls, signed streaming). That historical milestone remains true.

**Anonymous Preview Share is OFF** (failed `bdfc489`, rolled back). Do **not** restore without read-only root-cause investigation. Dormant `studio_drafts.share_slug` migration remains applied but unused.

**P1 (after email auth P0):** safe anonymous Preview Share / WhatsApp. **P2:** Biblioteca WhatsApp Share via existing `ShareCommercialActions`. See **MASTER UPDATE — Session Close (September 2, 2026)**.

### Commercial Rescue / Inspector / Escalation

**Commercial Rescue R1:** isolated local FFmpeg repair library. Architecture and evidence: `docs/commercial-rescue-r1-closeout.md`. Closeout verdict: **READY WITH EXCLUSIONS** for a clean selective commit. Inspector is **not** implemented. Library was uncommitted at closeout.

**Inspector:** intentionally **not** a universal AI judge. Decomposed by defect category. Feasibility matrix lives in the closeout document (58 rows: Deterministic 20 · Reliably machine-inspectable 5 · Probabilistic 10 · Human-judgment 23). Do not duplicate every row here.

**Human escalation:** internal production architecture. Not a customer-facing button, advertised premium service, or default workflow.

### Active Next Objective — superseded September 2, 2026

The August 18–20, 2026 GTM launch-hardening checklist is **historical context**, not the active execution compass.

**Current P0:** universal email auth / access without Google — preserve production-validated Google Handoff. See **NEXT SESSION START HERE** and **MASTER UPDATE — Session Close (September 2, 2026)**.

### CEO Product Rule

The **CEO Product Review** remains the final validation step for product work. Compilation is not completion.

Launch classification now also applies:

* **P0** — blocks public launch
* **P1** — should complete before launch
* **P2** — post-launch

Do not automatically classify every unfinished feature as P0.

### Validation Environment

Official development environment: `localhost`

Official production domain: `https://www.metaprom.com`

Canonical Stripe Live webhook: `https://www.metaprom.com/api/payments/webhook`

Official repository: `metaprom-ai`

**Current production commit (September 2, 2026):** `655dcc1b2c25756e7102f4e2ef9d54dd18a56dfd` (`655dcc1`)

Historical production commit from Commercial Rescue closeout and Stripe Live audit (August 18, 2026): `078da0545d086b53e46fcea9cd59b4843c9dd6cb`

---

## NEXT SESSION START HERE

**Canonical as of September 2, 2026 session close.** Supersedes the August 18–20, 2026 GTM launch-hardening checklist as the active execution compass.

**Hard guardrails before any risky change:** identify exact known-good commit/deployment. If a change breaks generation, Preview completion, authentication continuity, claim, Premium, payment, or another critical customer flow — **REVERT immediately** to known-good. Current production reference: `655dcc1`. Do not infer validation of unrelated functionality merely because deployment is READY.

**Do not touch without concrete evidence:** anonymous generation → Preview (production-validated); Google NewUserHandoff (production-validated); Director V2 (closed baseline); Premium FFmpeg fix (`53b5727`).

**Do not restore:** `bdfc489` anonymous Share implementation.

Use the zero-cost Preview fixture (`http://localhost:3000/studio?ux4aReview=1`) for almost all post-generation UX development. One real production generation only for final E2E acceptance when necessary.

---

### P0 — NOW: UNIVERSAL EMAIL AUTH / ACCESS WITHOUT GOOGLE

Start with **READ-ONLY investigation**.

**Goal:** Google remains the easiest primary path, but customers can also authenticate/register using any normal email address (Outlook, Hotmail, Yahoo, corporate/business email, other valid addresses).

**Preserve:** production-validated Google Handoff, anonymous draft, resume token, claim, same-commercial continuity, generation firewall.

**Preferred UX direction:** avoid forcing traditional password creation if possible. Investigate Supabase-supported email OTP / magic-link style authentication.

**Desired flow:** Guardar mi comercial → Continuar con Google **OR** Continuar con correo electrónico.

**Do not disturb** the now production-validated Google Handoff. Use the zero-cost fixture for testing.

---

### P1: ANONYMOUS PREVIEW SHARE / WHATSAPP

**Before coding:** read-only root-cause investigation of `bdfc489` and the 96% regression. **Do NOT restore `bdfc489`.**

**Desired final E2E:** anonymous sender → Preview → WhatsApp Share → recipient opens public Metaprom page without auth → sender later Guardar/login → same commercial in Biblioteca → original shared link continues working.

Use fixture for most development.

---

### P2: BIBLIOTECA WHATSAPP SHARE

Existing `ShareCommercialActions` infrastructure already exists for eligible assets. Treat as separate small block after anonymous Share foundation is safe.

---

### P3: PREMIUM DELIVERY MANUAL ACCEPTANCE

Perform one real acceptance test of the dedicated finished-commercial delivery surface (`7a2e85f`) if still pending. Premium processing UX is personally validated (`ed76f5f`); dedicated delivery acceptance is **not**.

---

### P4: STRIPE / ANNUAL PACKAGES

Investigate actual current production Veo unit economics first. **Do NOT** use old Kling assumptions as final pricing evidence.

Strategic package candidates: MX$2,990/year, MX$4,990/year. Positioning: professional advertising for the whole year at radically simpler/lower total cost than assembling multiple AI tools. Finalize exact included generation capacity only after real current Veo economics are verified.

---

### P5: CUSTOMER ACQUISITION — HARD

After the above launch-minimum barriers: TikTok, Facebook, WhatsApp, organic demos/content, outreach, then measured paid acquisition. Do not continue polishing indefinitely before customer acquisition.

---

### Lower priority — do not displace P0–P5 without new evidence

Internal health/alerts dashboard; generated text typo/orthography (e.g. “JARDON”); OAuth branding/custom auth domain; abuse/one-anonymous-generation controls; no-photo generation path; other cosmetic optimizations.

August 19, 2026 product-architecture records (Storyboard, Preview Pro, Motion Preview, refunds, duration/trim) remain **documented direction, not live implementation work**. GTM #5.3 Premium guarantee remains published. Do **not** begin GTM #6 from this record.

---

## MASTER UPDATE — Session Close (September 2, 2026)

*Canonical record for production baseline, NewUserHandoff rebuild validation, zero-cost Preview fixture, anonymous generation health, failed anonymous Share rollback, dormant share_slug infrastructure, Google Handoff production validation, universal email auth P0, Premium Delivery pending acceptance, engineering doctrine, and next-session priorities. **Supersedes** **Current State** and **NEXT SESSION START HERE** from August 18–20, 2026 where they conflict. Historical incident records below remain valid context.*

### 1. Current production baseline

| Field | Value |
| --- | --- |
| **Commit** | `655dcc1b2c25756e7102f4e2ef9d54dd18a56dfd` (short: `655dcc1`) |
| **Message** | `feat: rebuild new user handoff with preview fixture` |
| **Deployment** | `dpl_4Ba3MSXYhg6v4Y2MwF8jU5qX3dkF` — **READY** |
| **URL** | https://www.metaprom.com |
| **Previous known-good rollback baseline** | `c58285a47ef5368bc61091bfba1e1be763e65a78` (short: `c58285a`) |

Release `c58285a` → `655dcc1` contained exactly **one** application commit.

**Release validation:** 76/76 relevant tests PASS. Vercel Production build/deployment READY.

**Known unrelated local-only issue:** `tmp-caroline-smith-qa/run-hero-still.mts` scratch TypeScript error during local `next build`. **Not** a production application failure.

### 2. New User Handoff — production validated

The rebuilt NewUserHandoff is **personally validated in REAL PRODUCTION** on a mobile phone.

**Production acceptance test (Roberto):**

1. Anonymous visitor entered Studio
2. Generated a **real** commercial
3. Generation completed successfully
4. Preview displayed successfully
5. Tapped “Guardar mi comercial” **once**
6. Authentication flow opened
7. Authenticated with Google
8. Returned successfully to Metaprom
9. **Same** anonymously generated commercial appeared correctly in Biblioteca

**Result: PASS.** This validates the Google-based NewUserHandoff in real production.

**UX improvement:** “Guardar mi comercial” no longer appears stubborn/unresponsive while draft persistence occurs. The rebuilt handoff gives immediate visible feedback and automatically progresses through authentication. One tap is sufficient. Duplicate taps are blocked.

**Locally tested states:** “Preparando tu comercial...” → “Abriendo Google...”

**Contracts preserved:** existing draft/auth/claim contracts; no second generation; same anonymous creation claimed into authenticated account.

### 3. Zero-cost Preview handoff fixture

A protected zero-cost Preview fixture now exists for post-generation UX testing.

**Purpose:** Allow repeated testing of Preview → Save/Auth and future Preview → Share behavior **without** calling generation providers and **without** consuming generation credits.

| Field | Value |
| --- | --- |
| **Local URL** | `http://localhost:3000/studio?ux4aReview=1` |
| **Fixture media** | Existing coffee commercial assets |
| **Protection** | Requires `?ux4aReview=1` **and** loopback/development conditions. Cannot activate for normal production users. |

**Fixture does NOT call:** commercial generation, image generation, OpenAI, Veo, Premium fulfillment, credit consumption.

**Local manual result:** Preview fixture → Guardar mi comercial → immediate preparation feedback → Google authentication → successful return → **same** coffee commercial in Biblioteca. **PASS.**

**Strategic value:** Post-generation UX can now be iterated/tested dozens of times without generating a new commercial. Use one real production generation only for final E2E acceptance when necessary. Permanent development/testing tool.

### 4. Anonymous generation → Preview

**Personally production-validated:** anonymous generation successfully reaches Preview in production.

| Event | Detail |
| --- | --- |
| Historical 96% stall fix | `58689be` |
| Mobile Preview UX | `8b7281b` |
| Failed Share reintroduced 96% stall | `bdfc489` — rolled back |
| Post-rollback confirmation | Roberto personally confirmed anonymous generation completed successfully |
| Post-handoff release (`655dcc1`) | Roberto performed **real** anonymous generation on mobile; successfully reached Preview |

**Current status:** Anonymous generation → Preview is **production healthy.** Do **not** reopen or modify this path without concrete evidence.

### 5. Failed anonymous Share attempt — keep rolled back

| Field | Value |
| --- | --- |
| **Failed implementation** | `bdfc489` — `feat: share anonymous commercial previews` |
| **Production result** | First real production acceptance test immediately regressed anonymous commercial generation to the 96% stall |
| **Response** | Per Metaprom guardrail: **not** debugged forward; **reverted** |
| **Rollback commits** | `5d12806` (`git revert bdfc489`); `c58285a` retained only additive dormant `studio_drafts.share_slug` migration |

**Current state:** Anonymous Share remains **OFF.** Do **not** restore `bdfc489`. Do **not** retry the same implementation blindly.

**Before reimplementing Anonymous Share:** perform read-only root-cause investigation to determine exactly which application change in `bdfc489` reintroduced the 96% completion regression. Use the zero-cost Preview fixture for almost all future Share development/testing. Only one final real generation should be necessary for production E2E acceptance.

### 6. Dormant share_slug infrastructure

The additive Supabase migration remains applied:

`supabase/migrations/20260902120000_studio_drafts_share_slug.sql`

Adds nullable `studio_drafts.share_slug` plus its partial unique index.

**Current application code does NOT use it.** Dormant and compatible with production. Do not remove it merely because Share is currently OFF. Do not activate it until the future Share implementation is evidence-based and isolated.

### 7. New User Journey — important status correction

**Do NOT** mark the entire New User Journey as fully closed.

| Component | Status |
| --- | --- |
| **Google Handoff** | **PRODUCTION VALIDATED / PASS** |
| **Universal account access** | **OPEN / P0** |

Current authentication only offers Google. This creates a real customer-entry barrier. Metaprom must **not** assume every customer has a Google account, has Gmail, or wants to connect Google.

**Desired future customer experience:**

Guardar mi comercial → choose:
- Continuar con Google
- **OR** Continuar con correo electrónico

The email option should accept normal email identities: Outlook, Hotmail, Yahoo, corporate/business email, other valid email addresses.

**Preferred UX direction:** avoid forcing traditional password creation if possible. Investigate Supabase-supported email OTP / magic-link style authentication.

**Core product contract (unchanged):** anonymous creation → Preview → Guardar → authenticate by Google **or** email → **same** creation appears in Biblioteca.

**Next session:** begin with READ-ONLY investigation of existing Supabase Auth/login/callback/claim architecture. Determine the smallest safe way to add email authentication **without** disturbing the now production-validated Google Handoff.

### 8. Premium delivery status

| Component | Status | Commit |
| --- | --- | --- |
| **Premium processing UX** | Personally production-validated | `ed76f5f` — Director + progress bar display correctly |
| **Premium Delivery UX** | Implemented/deployed; **final dedicated acceptance pending** | `7a2e85f` |

Dedicated finished-commercial delivery surface includes:
- “¡Tu comercial está listo!”
- HD video
- Ver en mi Biblioteca
- Descargar comercial HD
- Crear otro comercial

Do **not** incorrectly mark Premium Delivery as personally validated unless a later explicit real production test proves otherwise.

### 9. Director V2 / generation

**Director V2: CLOSED / PRODUCTION BASELINE.**

| Commit | Significance |
| --- | --- |
| `c5c0b68` | Known-good Director/generation semantic baseline |
| `e3a43b2` | Beats-specific retry fix |
| `eeab107` | Director V2 Phase 1+2 |
| `8eb78a1` | Director UI workspace |
| `f610f94` | V2 controlled handoff |
| `d14431f` | V2 default with V1 rollback |

Director V2 has extensive manual regression validation and real generation/Premium E2E validation. Do not optimize/refactor/touch Director V2 absent concrete evidence. V1 remains frozen rollback path. Generation firewall remains a core architectural guardrail.

### 10. Premium FFmpeg

Premium audio-only production bug fixed at `53b5727`.

**Root cause:** FFmpeg 7.0.2 Linux + scale2ref + single-frame PNG overlay produced zero filtered video frames.

**Minimal fix:** `-loop 1` promotional overlay input.

Roberto personally generated a complete Premium successfully afterward. **CLOSED** unless evidence recurs.

### 11. Rebuild over repair doctrine

**METAPROM — REBUILD OVER REPAIR**

When a critical component has structural failure or successive patches:
- stop repairing architecture that has lost trust,
- freeze the healthy system,
- identify the component boundary,
- rebuild only the broken component in parallel,
- preserve healthy server/contracts/downstream systems,
- turn previous failures into tests,
- switch only after evidence.

But:
- **do not** indiscriminately rewrite healthy systems,
- if architecture/contracts are healthy and pieces are merely disconnected: **WIRE, NO REBUILD**,
- for localized bugs with proven root cause: **MICROFIX**,
- for risky production regressions: **REVERT FIRST** to known-good — do not debug forward while customers are exposed.

**NewUserHandoff rebuild (`655dcc1`)** is the successful exemplar: healthy auth/claim contracts preserved, fragile client orchestration rebuilt, fixture created, local validation performed, isolated production release, real mobile production acceptance PASS.

### 12. Product funnel — current desired contract

| Action | Anonymous allowed? |
| --- | --- |
| Generate | Yes |
| Watch/Replay Preview | Yes |
| Share | Desired yes — **currently OFF** pending safe reimplementation |
| Save to Biblioteca | Registration/authentication required |
| Create another | Registration/authentication gate candidate |
| Premium | Registration/authentication required |

Registration/authentication must preserve the exact anonymous creation. Never make the customer regenerate after signing in.

**Save value proposition:**
- “¿Te gustó tu creación? Guárdala.”
- “Regístrate gratis y conserva este comercial y todo lo que generes próximamente en tu Biblioteca.”
- CTA: “Guardar mi comercial”

### 13. Next priorities — reconciled

See **NEXT SESSION START HERE** for the exact strategic order (P0–P5). Summary:

| Priority | Item |
| --- | --- |
| **P0** | Universal email auth / access without Google |
| **P1** | Anonymous Preview Share / WhatsApp (after root-cause investigation) |
| **P2** | Biblioteca WhatsApp Share |
| **P3** | Premium Delivery manual acceptance |
| **P4** | Stripe / annual packages (verify Veo economics first) |
| **P5** | Customer acquisition |

### 14. Lower priority — do not distract now

Keep visible but below launch priorities: internal health/alerts dashboard; generated text typo/orthography (e.g. “JARDON”); OAuth branding/custom auth domain; abuse/one-anonymous-generation controls; no-photo generation path; other cosmetic optimizations. Do not allow these to displace P0–P5 without new evidence.

### 15. Product / market strategy to preserve

Metaprom philosophy: the customer should not learn AI or become “the glue” between image tools, video tools, voice tools, editing tools, prompting, and model selection. Metaprom delivers the finished advertising outcome.

> Las herramientas de IA generan partes. Metaprom entrega el resultado.

Core transformation: customer says what they need to sell → Metaprom understands → produces finished advertising asset → customer publishes/shares it.

Sharing remains strategically important: Preview belongs to Metaprom; Premium belongs to the customer. Creation → Distribution → Audience → Platform.

### 16. Engineering safety baseline

Before any risky change: identify exact known-good commit/deployment.

If a change breaks generation, Preview completion, authentication continuity, claim, Premium, payment, or another critical customer flow — **REVERT immediately** to known-good behavior. Do not improvise additional patches on top of a newly broken production state.

**Current production commit at session close:** `655dcc1`

This becomes the new production reference only for behavior that has actually been validated:

| Behavior | Validation |
| --- | --- |
| Google NewUserHandoff | Personally production-validated |
| Anonymous generation → Preview | Personally production-validated |
| Premium Delivery dedicated surface | **Not** personally validated |
| Anonymous Share | **OFF** |

Do not infer validation of unrelated functionality merely because the deployment is READY.

---

## MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)

*Canonical record for publishing the Premium Commercial customer guarantee. Supersedes August 19, 2026 language that this satisfaction/rework/refund-if-undeliverable principle must remain unpublished, merely philosophical, or legally OPEN for the specific case of Metaprom AI being unable to deliver the purchased Premium Commercial. Does **not** supersede Stripe Live operations, prices, GTM #1–#5.2 protections, or the GTM launch checklist. Does **not** start GTM #6.*

### Approved product principle

For Premium Commercials, Metaprom AI sells the **finished advertising product**, not an AI-generation attempt.

AI generation is only one part of Metaprom AI's production process.

Metaprom AI bears generation/production risk **within the purchased scope**.

If an AI generation does not work, that production risk belongs to Metaprom AI, not the customer. Metaprom AI continues working on the result within the purchased scope.

If Metaprom AI cannot deliver a satisfactory Premium Commercial within that purchased scope, the corresponding payment **is refunded**.

This is an intentional customer guarantee. It is not “may refund,” “may consider a refund,” or “at our sole discretion.” It is not “AI results are not guaranteed, therefore the customer accepts the output.”

### Boundary

This guarantee does **not** create:

* unlimited concepts
* unlimited scope changes
* unlimited revisions unrelated to correcting or finishing the purchased product
* a right to repeatedly change the requested product after production
* a refund after satisfactory delivery simply because the customer later changes their mind

The key boundary remains: **within the scope of the Premium Commercial purchased.**

Customer review of the **final delivered content** before publication remains. That review responsibility is not the same as accepting whatever an AI model generated during production.

During production: Metaprom AI bears the production risk within the purchased scope.

After satisfactory delivery: the customer remains responsible for reviewing the final content before publication and for how/where they use it.

Do not create claims of platform compliance, legal compliance, advertising approval, or guaranteed business results.

### Customer-facing surfaces aligned by this update

* Landing FAQ (ES/EN) — approved failed-generation answer preserved
* Payments, Credits, Cancellations, and Refunds
* Terms §5
* Planes / Premium purchase FAQ
* Premium checkout links to those documents without adding checkout friction

For the specific case of Metaprom AI being unable to deliver the purchased Premium Commercial, customer-facing language must not contradict itself with discretionary refund wording.

### Unchanged

Stripe configuration, Stripe prices, checkout mechanics, webhook behavior, purchase integrity (GTM #2), antiabuse (GTM #3), Premium fulfillment security, and GTM #1–#5.2 protections remain intact. Package prices are unchanged.

This update is legal/copy/product-guarantee alignment. It is **not** a refund-engine implementation and **not** GTM #6.

---

## MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)

*Historical strategic phase record. **Superseded for active execution order, Share status, and production baseline** by **MASTER UPDATE — Session Close (September 2, 2026)**. Stripe Live operations, product positioning, Commercial Rescue / Inspector philosophy, and September 7, 2026 planning target remain valid context. Supersedes earlier current-state language in pre-GTM records where they conflict. Prior sections remain historical context and previously validated decisions remain valid unless explicitly updated by September 2, 2026.*

*August 19, 2026: core commercial philosophy (results, not generations), Correction vs Exploration, preferred future Preview architecture, rejected Motion Preview, Preview Pro project-credit concept, and related open questions are recorded in **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**. Same-day duration / trim / Preview-Premium **LAUNCH PRODUCT GATE** conclusions are recorded in **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Those updates do **not** replace this GTM launch record. After documenting them, return to this GTM checklist. Where this GTM commercial-philosophy language is less specific than the August 19 formulation, the August 19 records govern product philosophy. LIVE Studio / Preview behavior remains as shipped. Production-account Veo cost remains unverified.*

### 1. Strategic Phase Transition

Metaprom has entered a major transition: from prolonged BUILD / Product Development toward GO TO MARKET.

The product will never be perfect before launch. The operating loop is BUILD → SELL → OBSERVE → IMPROVE.

**Pre-launch rule:** no new feature without launch justification. Until public launch, a feature enters the critical path only if it materially affects UNDERSTAND → BUY → PRODUCE → RECEIVE → USE / SHARE. Everything else is post-launch backlog.

The objective is a minimum commercially launchable Metaprom.

### 2. Official Product Definition / Positioning

Metaprom is **not** primarily an AI generation tool.

Metaprom is an **AI-powered advertising production platform / advertising factory**.

Core distinction: **TOOL vs FACTORY** and **GENERATION vs PRODUCTION**.

A generative tool gives the user capabilities and generations. Metaprom accepts the desired commercial result and manages production toward a usable finished advertising asset.

The AI models are production machinery inside the factory.

**THE MODELS ARE NOT THE PRODUCT. THE DELIVERED ADVERTISING ASSET IS THE PRODUCT.**

Core customer promise: the customer should not need to become a prompt engineer, AI model expert, video editor, audio engineer, production supervisor, or format expert. The customer explains what they need. Metaprom handles the production complexity.

Official slogan, preserved:

> Escribe lo que imaginas. Metaprom entiende el resto.

This slogan is now understood as directly aligned with the factory philosophy — not as a prompt-engineering invitation.

Older MASTER language that describes Metaprom as evolving from an “AI Commercial generator,” or that “the Director is the product” as what the customer buys, is **superseded** as current commercial truth. The Director remains a primary competitive advantage and the customer's production interface. What the customer **buys** is the finished advertising asset. Historical sections that used generator / Director-as-product language remain useful history.

### 3. Official Commercial Philosophy

Governing principles:

> Generar es fácil. Entregar algo que puedas usar es otra cosa.

> No compras intentos. Compras el resultado.

> Metaprom no cobra por darte acceso a un generador. Metaprom cobra por encargarse de la producción.

> Con una herramienta, tú haces la producción. Con Metaprom, la hacemos nosotros.

> Los modelos no son el producto.

> El cliente compra la pieza terminada, no las generaciones.

**August 19, 2026 — major product principle (canonical formulation):**

> **METAPROM DOES NOT SELL GENERATIONS. METAPROM SELLS RESULTS.**
> **METAPROM NO VENDE GENERACIONES. VENDE RESULTADOS.**

The customer purchases a finished professional commercial they are satisfied with. They do not purchase one Veo generation, one attempt, a retry quota, compute, tokens, or an AI lottery ticket. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§1–3 and §13.

**Messaging candidates** — subject to final commercial copy review. **Not** necessarily final immutable landing copy:

* “Metaprom no es otra herramienta de IA. Es tu fábrica de publicidad.”
* “No necesitas aprender IA para hacer publicidad con IA.”
* “No pagas por usar nuestra tecnología. Pagas por lo que te entregamos.”
* “Tú pides el comercial. Nosotros nos encargamos del resto.”
* “Si algo sale mal durante la producción, ése es nuestro problema, no el tuyo.”

Do **not** convert reasonable production responsibility into unlimited revisions, unlimited concept changes, or refund rights for arbitrary post-delivery changes of mind. For Premium Commercials, the satisfaction / continue-working / refund-if-undeliverable principle is **no longer unpublished philosophy**. It is a published customer guarantee as of **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)**. Operational limits for correction/rework remain a production matter; they must not weaken the published delivery-failure refund.

### 4. The “Free AI” Objection — P0 Positioning

Potential customers may reasonably ask:

> Why should I pay Metaprom if Flow / other AI tools let me generate videos for free?

Metaprom must **not** pretend free or cheap generation does not exist. Explain the category difference.

**Free / credit-based generation:** the user operates the tool, prompts, evaluates output, retries, corrects, edits, and determines when it is usable.

**Metaprom:** the customer states the desired result; the Director interprets the production need; Metaprom coordinates production; approved components are preserved; failed components are repaired/retried; exact commercial information is composed deterministically where possible; production is verified; the finished asset is delivered.

The comparison is **not** FREE AI vs PAID AI.

The comparison is **DO IT YOURSELF** vs **METAPROM DOES THE PRODUCTION FOR YOU**.

This customer education must be explicit enough to justify pricing without requiring the customer to study generative AI. Do not attack competitors by name unnecessarily. Explain the category difference factually.

### 5. Landing / FAQ Commercial Education — Pre-Launch P0

Landing may remain visually premium and minimalist, but commercial communication must become substantially clearer and more explicit.

Required conceptual section: **GENERAR NO ES PRODUCIR.**

Required comparison concept:

| Generation tool | Metaprom |
| --- | --- |
| You write/adjust prompts | You say what you need |
| You inspect generations | Metaprom manages production |
| You regenerate failures | Metaprom repairs/retries production |
| You edit | Metaprom finishes the asset |
| You determine when it works | You receive usable advertising |
| You receive generations | You receive finished advertising |

FAQ must explicitly address at minimum:

* What is free AI generation?
* Why pay Metaprom if AI generation can be free?
* What makes Metaprom AI different?
* Is Metaprom an AI generator?
* Do I need to know AI?
* Do I need to know prompting?
* Do I need to choose a model?
* What happens if a generation fails?
* What exactly am I buying?
* Can Metaprom produce for Amazon / Mercado Libre / Shopify / Real Estate?
* How does Metaprom handle corrections / production problems?

FAQ answers must not describe the purchase as a generation, attempt, or lottery ticket. **What the customer buys is a result.** Distinguish **correction** (Metaprom's execution failure — part of delivering the product) from **exploration** (customer wants a different creative direction). For Premium Commercials, if Metaprom AI cannot deliver a satisfactory finished commercial within the purchased scope, the corresponding payment is refunded. See **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)** and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§1–3.

### 6. Director Role Redefinition

Creative Director should increasingly be understood as **DIRECTOR DE PRODUCCIÓN / PRODUCTION DIRECTOR**, not merely “chat with our AI.”

The Director understands what the customer wants to sell/communicate, destination/channel, required asset, production constraints, commercial information, and brand/product requirements — and coordinates the factory.

Users ask for **outcomes**, not technical parameters.

| Not this | But this |
| --- | --- |
| “Create a 2048x2048 AI image.” | “I need images to sell this on Amazon.” |
| “Generate a 9:16 10-second video.” | “I need a TikTok ad for this product.” |
| “HDR correction + virtual staging.” | “I need this property ready to publish.” |

Director jurisdiction, immutable customer copy, Production Risk vs marketing language, and Dual Creation routing remain in force. See **Creative Director** and `CREATIVE_DIRECTOR_ARCHITECTURE.md`.

### 7. Destination-Aware Production

Strategic product direction: expand from generic Commercial / Advertising Image toward customer-recognizable production destinations / use cases:

* Instagram / TikTok / social commercials
* Amazon
* Mercado Libre
* Shopify / ecommerce
* Real Estate
* general social advertising
* future: menus, flyers, posters, catalogs, and other commercial assets

Organizing principle: **WHAT DOES THE CUSTOMER NEED TO PRODUCE, FOR WHERE, AND FOR WHAT PURPOSE?**

Potential future commercial packaging (roadmap only — **do not implement these packs now**):

* Amazon Pack
* Mercado Libre Pack
* Shopify / Ecommerce Pack
* Real Estate Pack
* Social / Commercial Pack

This is product/commercial roadmap direction, not a pre-launch BUILD item.

### 8. Pricing Philosophy

Current commercial price remains **1 Commercial = MXN $180**.

Current package ladder remains unless separately changed (see Current State table).

Do **not** lower the $180 launch price preemptively. There is currently insufficient real-market evidence that $180 is too high. Validate pricing through real conversion behavior after launch / soft launch.

Metaprom pricing should speak the language of **results**, not compute.

Prefer: “1 Commercial”, “10 Advertising Images.”

Not: “X AI generations”, “X tokens”, “X model credits.”

Normal internal retries/repairs are production cost, not customer generation units. Corrections (Metaprom failed to execute approved direction) must not be monetized as exploration. Optional paid exploration (future Preview Pro) is a separate concept and is **not live**. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§3, 9–10, 13.

Future unit economics must measure:

* provider cost per base generation
* average video generations per delivered commercial
* image generations per delivered image
* cheap component retries
* local rescue rate
* expensive regeneration rate
* human escalation rate
* expected cost per delivered asset
* worst automatic cost before escalation
* gross production margin

Commercial Rescue exists in part to reduce cost variance by avoiding expensive full regeneration when deterministic/local repair can save the asset.

### 9. Commercial Fidelity / Commercial Rescue R1

Official production principle:

> Producto exacto. Mensaje exacto. Creatividad libre alrededor.

**Protect:** packaging, labels, logos, critical typography, shape, colors, proportions, exact commercial copy where required.

**Creative freedom:** camera, lighting, environment, particles, transitions, atmosphere, pacing/motion where safe.

Copy/branding should remain deterministic where required rather than delegated to generative video.

**Commercial Rescue invariants:**

* PRESERVE WHAT WORKS.
* REPAIR ONLY WHAT FAILED.
* NEVER REGRESS.
* CURRENT VALID STATE MUST BE EXPLICIT.
* NEVER REGENERATE WHAT METAPROM CAN REPAIR.

Do not silently choose sources based on filename, “final” suffix, newest mtime, or arbitrary directory search. Ambiguous provenance: **FAIL CLOSED**.

General escalation concept (exact order may vary by defect class):

```
PASS
→ LOCAL DETERMINISTIC REPAIR
→ CHEAP COMPONENT RETRY
→ ALTERNATE CHEAP COMPONENT STRATEGY/PROVIDER
→ EXPENSIVE VIDEO REGENERATION
→ INTERNAL HUMAN ESCALATION
```

**R1 closeout (August 18, 2026):** research cycle closed. Isolated local FFmpeg repair library. Not an Inspector, not a Director path, not a customer feature. Tests at closeout: `npm run test:video-repair` → 13 pass / 0 fail. Verdict: **READY WITH EXCLUSIONS**. Include/exclude lists and known caveats are in `docs/commercial-rescue-r1-closeout.md`. Do not commit QA trees (`tmp-*`), unrelated dirty files, or wire production in the R1 commit.

### 10. Sattva / Caroline Learnings

Preserve actual QA evidence. Do not pretend automation performed better than it did. Contemporaneous automation records and later human/owner judgment are listed separately in `docs/commercial-rescue-r1-closeout.md`. Summary:

**Sattva**

* Packaging was ultimately judged visually excellent by human review.
* Automated packaging scoring had been harsher than human judgment (contemporaneous overall identity 7/10 FAIL vs later human excellent). Microcopy issues remain real.
* Extra-hand anomaly was localized around **~3.54s–4.75s** (human frame review: 3.542s–4.750s / frames 85–113).
* An earlier automated defect-window conclusion materially overstated the duration of the defect (first treated as 2.25s–10.0s).
* Direct cutting removed the visual defect but introduced timeline/audio continuity problems.
* Editorial cutaway successfully rescued the localized visual problem with effectively **zero additional generative provider cost**.
* TTS/ASR could report the expected brand word while human listening still heard poor pronunciation such as “Chacha” / “Schatva”.
* Exact CTA/phone overlay could be handled deterministically (`PÍDELO POR WHATS AL 5529 434693`).
* Pronunciation quality remains a strong example of an area where machine verification can be weaker than human listening.

**Caroline**

* Result was human-judged highly sellable / premium.
* Product remained recognizably faithful.
* Minor garment/detail changes existed (coat recognizable, not pixel-faithful).
* No major anatomy defect observed.
* Composed video/audio demonstrated strong end-to-end commercial value.

### 11. Inspector Philosophy

Inspector must **not** be designed as a magical universal AI judge.

Inspection is decomposed by defect category.

Latest feasibility work (closeout matrix, 58 rows, one primary class each):

* **20** deterministic categories
* **5** reasonably machine-inspectable categories
* **10** probabilistic / confidence categories
* **23** human-judgment / escalation categories

Do not duplicate all rows into MASTER. Canonical matrix: `docs/commercial-rescue-r1-closeout.md` §5. Interactive canvas `inspector-feasibility-matrix.canvas.tsx` is outside the git repo.

High-level status model:

* HARD_PASS
* LIKELY_PASS
* REPAIR
* RETRY_COMPONENT
* REGENERATE
* ESCALATE_INTERNAL
* FAIL_TECHNICAL

Smallest future Inspector R1 should prioritize strong automation:

* deterministic media health
* deterministic copy/overlay verification
* technical A/V checks
* unauthorized speech/vocal checks on isolated stems where evidence supports reliability
* structured production QA output

Do **not** hard-gate subjective “premium” quality with weak automated scoring.

Do **not** claim universal pronunciation-quality inspection.

Inspector is **not** implemented. Do not implement it as a pre-launch P0 unless a later launch-readiness audit separately classifies a minimal media-health slice as blocking.

### 12. Internal Human Escalation

Human escalation is **INTERNAL**.

It is **not**: a customer-facing button, an advertised premium service, or the default workflow.

Director/Orchestrator may internally escalate when automated production cannot reach sufficient quality/confidence within defined repair attempts, retry limits, provider-cost budget, time budget, and confidence limits.

The customer should experience **one continuous Metaprom production process**.

Possible escalation triggers:

* repeated low-confidence inspection
* repair attempts exhausted
* expensive regeneration limit reached
* brand/product fidelity ambiguous
* pronunciation cannot be reliably judged automatically
* contradictory inspection results
* customer-critical element cannot be verified

Initial limits recorded in the closeout document are **engineering defaults** and must not become public customer promises without separate approval.

### 13. Share System — historical GTM P0 (superseded September 2, 2026)

**September 2, 2026 reconciliation:** Anonymous Preview Share is **OFF** (`bdfc489` failed and rolled back). Biblioteca Share infrastructure exists. Active priorities: P1 anonymous Share (after investigation), P2 Biblioteca Share. See **MASTER UPDATE — Session Close (September 2, 2026)**.

**Historical context:** RC1.4 recorded Share Experience as “functionally complete.” That was true as a **historical foundation** (share controls, `share_slug`, public `/p/{share_slug}` pages, signed-URL streaming, CTA). It is **not** current launch-complete status.

Share was **LAUNCH-CRITICAL** under August GTM and required final hardening/validation.

Official principle remains:

> PREVIEW BELONGS TO METAPROM.
> PREMIUM BELONGS TO THE CUSTOMER.

Required launch behavior for **VIDEO AND IMAGE** previews:

* no direct preview download
* share should distribute a Metaprom public share page, not merely raw media
* public recipient can view without account
* shared page includes Metaprom branding and acquisition CTA
* recipient can route into signup/create flow
* avoid exposing direct Storage URLs that bypass the Metaprom experience
* sharing should support practical channels: WhatsApp, SMS, copy link, X / relevant social flows where appropriate
* Mexico can prioritize WhatsApp
* English/USA experience should emphasize SMS/copy-link appropriately
* do not show Spanish promotional share assets in English browser context
* video and image share should follow the same product philosophy
* purchased Premium/original assets retain their normal download rights

Required instrumentation (launch requirement — not claimed as already complete):

* `share_created`
* `share_opened`
* `share_to_signup`
* `share_to_creation`
* `share_to_purchase`

Existing growth events such as `share_whatsapp` / `share_copy` are historical foundation, not the full required set.

Pre-launch validation should include: iPhone, Android, desktop, WhatsApp, SMS/copy-link, Spanish browser, English browser.

Sharing is both (1) product utility and (2) organic acquisition loop. Every shared preview can become a mini Metaprom landing page.

### 14. Stripe Live Webhook Incident — RESOLVED

**Incident:** Stripe Live webhook destination had been configured as `https://metaprom.com/api/payments/webhook`. Production canonical domain redirects apex to www. Stripe POST received **307 Temporary Redirect** to `https://www.metaprom.com/api/payments/webhook`. Stripe requires 2xx delivery and did not treat the redirect as successful. This caused repeated webhook delivery failures.

**Root cause:** Stripe Live endpoint URL configuration used apex instead of the canonical www endpoint. The webhook application handler itself was **not** the root cause.

**Resolution (August 18, 2026):** Existing Stripe Live webhook destination “Metaprom Production” was edited in Stripe Dashboard **ONLY**.

Changed:

`https://metaprom.com/api/payments/webhook`

to:

`https://www.metaprom.com/api/payments/webhook`

Preserved: existing destination, signing secret, event configuration, application code, Vercel configuration, production env.

No code deployment was required.

**Status: RESOLVED.**

### 15. Stripe Purchase #34 Recovery — VERIFIED / RESOLVED

**Purchase:**

* package: `assets_10`
* amount: MXN $99
* quantity: 10 Advertising Images
* purchase UUID: `2cb17a62-947a-4817-9842-9faa63cf84e9`
* Stripe Checkout Session: `cs_live_b1xXxo4J2a9TZFPmXRgMn7xM6lPRp30aXAiYTets9GOfDXDHVpleTn3Utf`
* Stripe Event: `evt_1U4NsQPMPkLtv2TRICJpZwo9`
* event type: `checkout.session.async_payment_succeeded`
* PaymentIntent: `pi_3U3r8GPMPkLtv2TR0E7ZhNOM`

**Stripe authoritative state:** `livemode: true`, `payment_status: paid`, Checkout status: `complete`.

**Historical delivery:** failed with HTTP 307 because of apex → www redirect.

**After endpoint correction:** Event manually resent on August 18, 2026 ~23:19 CST.

**Result:** Delivered. Recovered. HTTP 200. Response `ok: true`. Purchase status: `completed`. `pending_webhooks: 0`.

**Customer entitlement verification:** Advertising Image balance before recovery: **5**. After recovered webhook: **15**. Therefore exactly **+10** Advertising Image credits were visibly credited.

No manual credit grant was used.

This is strong evidence that the existing normal async Stripe fulfillment path works when the webhook reaches the correct endpoint. This is the Stripe / OXXO-style async Live path (`checkout.session.async_payment_succeeded`).

Purchase #35 / $180 Commercial had previously been fulfilled exactly once through the return/polling path and should remain idempotent.

**Stripe/OXXO #34 incident: RESOLVED.**

### 16. Payment Operations Lesson

The canonical Stripe webhook URL for production is:

`https://www.metaprom.com/api/payments/webhook`

Do not configure Stripe Live to the apex URL while apex redirects.

Webhook monitoring must be part of launch operations.

A paid Stripe transaction with missing Metaprom entitlement should be reconciled using authoritative Stripe state + normal idempotent fulfillment/replay whenever possible.

Do **not** manually grant credits unless a separate controlled recovery procedure explicitly requires it.

Test Mode Commercial E2E on www.metaprom.com (1 Commercial — MXN $180) remains a valid **historical** verification. Live Mode is now the operating mode for production payments.

### 17. Go-to-Market / Launch Roadmap

**PUBLIC LAUNCH TARGET:** Monday, **September 7, 2026**.

**Planning target, not an immutable promise.** Current date context: August 18–19, 2026.

Three parallel launch lanes:

**A — PRODUCT.** Unknown customer can understand, create, buy, receive, use/share.

**B — OPERATIONS.** Metaprom can observe, reconcile, repair, escalate, and support production.

**C — MARKET.** Content, social distribution, acquisition, and real customer traffic.

Provisional schedule:

**AUG 19–23 — LAUNCH BLOCKERS**

* Stripe final verification/monitoring
* clean R1 closeout/commit
* complete customer-journey audit
* classify P0/P1/P2
* legal minimum
* analytics/conversion instrumentation
* error/recovery UX
* real purchase/fulfillment regression
* share-system launch audit

**AUG 24–28 — PRODUCT FREEZE + COMMERCIAL WEBSITE**

* only launch blockers
* sharpen Landing positioning
* explain generation vs production
* pricing/CTA clarity
* FAQ
* Spanish/English behavior
* USA/MX behavior
* mobile validation
* full customer E2E

**AUG 29–SEP 2 — CONTENT FACTORY**

* Metaprom launch commercial
* before/after demonstrations
* suitable Caroline/Sattva-derived lessons/examples where commercially safe
* social assets
* vertical clips
* X / Instagram / TikTok content
* use Metaprom to market Metaprom

**SEP 3–6 — SOFT LAUNCH**

* controlled real traffic
* unknown-user testing
* observe: Landing → Director → generation → preview → checkout → payment → delivery → share
* fix only conversion/delivery blockers

**SEP 7 — PUBLIC LAUNCH TARGET**

* coordinated X / Instagram / TikTok launch
* transition into continuous SELL → OBSERVE → IMPROVE

Calendar may move if a genuine P0 remains unresolved. Do not move it merely because non-critical polish remains.

### 18. Social / External Launch

Current external channels: **X**, **Instagram**, **TikTok**.

These are launch distribution channels. The campaign should demonstrate rather than lecture.

Core content concept: show the difference between “amazing generation” and “publishable commercial.”

Possible narrative:

1. “This is a generation.” → reveal a subtle but commercially unacceptable problem
2. “This is a commercial.” → show finished corrected result
3. “Generating was easy. Finishing it was another thing. That's Metaprom.”

Do not make competitor-bashing the campaign. Own the category distinction: **GENERATION ≠ FINISHED ADVERTISING.**

### 19. Launch Readiness Classification

**P0 — BLOCKS PUBLIC LAUNCH**

Examples: payments/fulfillment broken; customer cannot complete core journey; paid asset cannot be delivered; serious share/privacy/access flaw; core product misunderstanding on Landing; critical mobile breakage.

**P1 — SHOULD COMPLETE BEFORE LAUNCH**

Examples: conversion polish; analytics completeness; FAQ; English/MX-US refinements; operational monitoring; recovery messaging.

**P2 — POST-LAUNCH**

Examples: broader Inspector sophistication; complete autonomous rescue; additional asset categories; advanced packs; nonessential UX polish; speculative features. Storyboard, Preview Pro, and project-credit accounting are **documented approved direction** and must **not** be auto-classified as P0 merely because they are documented. They are **not** automatically launch-blocking. **Preview/Premium differentiation** is a **LAUNCH PRODUCT GATE**: it must be established and validated before broad paid acquisition / serious public sales push, but that is **not** authorization to implement Storyboard / Preview Pro / duration/trim from documentation. Do not implement them from documentation. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

Do not automatically classify every unfinished feature as P0.

A closed P0 / P1 / P2 list is a **next-session deliverable** (formal launch-readiness audit). This section is the classification framework, not that closed list.

---

## MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)

*Canonical record for the Go-To-Market product-architecture discussion of August 19, 2026. Governs: core commercial philosophy (results, not generations), satisfaction/rework as product philosophy, Correction vs Exploration, preferred future Preview funnel, Storyboard purpose, rejected Motion Preview experiment, AI Video Preview purpose, Preview Pro same-project credit concept, and economic philosophy.*

*Duration, trim, customer-facing Preview length, Preview prompt philosophy, working (unverified) Fast economics, and Preview/Premium as a **LAUNCH PRODUCT GATE** are reconciled in the same-day **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. That micro-update supersedes this record where they conflict on those points. Native Veo minimum is no longer an open question.*

*Does **not** supersede **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** for strategic phase, Stripe Live operations, Share P0, Commercial Rescue / Inspector, launch lanes, or the public-launch planning target. The GTM one-page checklist remains the execution compass. This update is documentation of product decisions. It is **not** authorization to implement Storyboard, Preview Pro, Motion Preview, refunds, duration changes, trimming, Preview prompts, or any other non-checklist work.*

*LIVE Studio flow, current teaser/preview behavior, Stripe, prices, and Commercial Rescue R1 are unchanged by this record.*

### Status legend (this update)

| Label | Meaning |
| --- | --- |
| **LIVE** | Current product as shipped. Do not treat this update as a change to live behavior. |
| **APPROVED PRODUCT DIRECTION** | Decided future product architecture or commercial philosophy. **Not implemented. Do not implement from this record.** |
| **REJECTED EXPERIMENT** | Tested and rejected. Do not add to the funnel unless future evidence materially changes the conclusion. |
| **WORKING TECHNICAL FINDING** | Current working technical conclusion. Not live implementation. Not an audited billing fact unless separately labeled. |
| **APPROVED UX DIRECTION, REQUIRES TESTING** | Preferred customer-facing direction. Not live. Not a confirmed production spec until tested. |
| **LAUNCH PRODUCT GATE** | Must be established and validated before broad paid acquisition / serious public sales push. Not authorization to implement in this task. |
| **OPEN / REQUIRES VALIDATION** | Unresolved. Do not invent a decision, price, audited cost, legal term, or allowance. |

### 1. Core product philosophy — results, not generations

**Status:** **APPROVED PRODUCT DIRECTION** (major product principle). Compatible with GTM factory positioning. Strengthens, and where needed supersedes, earlier generator / “buy attempts” framing.

**METAPROM DOES NOT SELL GENERATIONS. METAPROM SELLS RESULTS.**

Spanish formulation:

**METAPROM NO VENDE GENERACIONES. VENDE RESULTADOS.**

A customer purchasing a Commercial is **NOT** purchasing:

* one Veo generation
* one attempt
* a fixed number of retries
* compute time
* model tokens
* an AI lottery ticket

The customer is purchasing:

**a finished professional commercial that they are satisfied with.**

Internal generation cost, retries, repair, regeneration, segment repair, deterministic overlays, Commercial Rescue, provider/model behavior, and human escalation are **Metaprom production concerns**.

They must not become the customer's technological risk.

The customer should never feel:

> “I already used my generation, it failed, so I lost my money.”

Related LIVE commercial language that remains valid and is now understood under this principle: GTM §3 (“No compras intentos. Compras el resultado.” / “El cliente compra la pieza terminada, no las generaciones.”), Current State pricing language of results not compute, and **Product Philosophy** “the customer buys results.”

### 2. Satisfaction / rework principle

**Status:** **PUBLISHED CUSTOMER GUARANTEE** for Premium Commercials as of **MASTER UPDATE — GTM #5.3 Premium Customer Guarantee (August 20, 2026)**. This is no longer unpublished product philosophy. Exact operational correction/rework limits remain a production matter and must **not** weaken the published delivery-failure refund.

Once a customer purchases a Premium Commercial, Metaprom should work and rework the product within the purchased scope until a satisfactory deliverable is achieved.

If Metaprom fails to execute the approved direction correctly, correcting that failure is part of delivering the purchased product.

Do **not** automatically charge another generation merely because Metaprom or the underlying model produced an inadequate result.

Commercial Rescue R1, deterministic repair, and selective regeneration support this philosophy economically.

Internal human escalation remains a fallback for exceptional cases.

If Metaprom cannot deliver a satisfactory Premium Commercial within the purchased scope, the corresponding payment **is refunded**. This is an intentional customer guarantee, not a discretionary “may refund.”

This guarantee does **not** create unlimited revisions, unlimited concept changes, or refund rights for arbitrary post-delivery changes of mind. Customer review of the final delivered content before publication remains. That review is not acceptance of a failed generation.

GTM §3 remains in force as a caution against converting this guarantee into unlimited revisions or refund-for-any-reason. Philosophy and published legal terms are now aligned for the Premium Commercial delivery-failure case.

### 3. Correction vs Exploration

**Status:** **APPROVED PRODUCT DIRECTION**. Critical commercial distinction. Not implemented as a billing system.

#### Correction

A correction means Metaprom failed to execute the creative direction / product that was already agreed or approved.

Examples:

* incorrect execution
* failed component
* unacceptable model artifact
* product fidelity failure
* incorrect copy / logo / composition
* generation failure
* execution inconsistent with approved direction

Corrections are part of delivering the purchased product.

They must **not** be monetized as additional creative exploration.

#### Exploration

Exploration means the customer voluntarily wants to try a **materially different** creative direction.

Examples:

* try a different concept
* change the emotional direction
* test another environment
* test different people / characters
* try another visual story
* explore another execution after already having a valid direction

Exploration may legitimately use paid optional previews (future **Preview Pro** concept — see §9).

**Metaprom must not charge customers for Metaprom's own mistakes under the label of Preview Pro.**

### 4. Preview architecture — preferred conceptual funnel

**Status:** **APPROVED PRODUCT DIRECTION**. **Not LIVE. Not implemented by this record.**

Preferred future architecture:

```
PHOTO / CUSTOMER ASSET
  → CREATIVE DIRECTOR
  → STORYBOARD / CREATIVE APPROVAL
  → AI VIDEO PREVIEW
  → PREMIUM COMMERCIAL
  → BIBLIOTECA
  → DOWNLOAD / SHARE
```

**LIVE** Studio / Biblioteca visual story remains the current product (photo → image / teaser / commercial as presently shipped). That live journey is **not** changed by this documentation.

This preferred funnel must **not** currently include a deterministic Motion Preview stage (see §6).

### 5. Storyboard purpose

**Status:** **APPROVED PRODUCT DIRECTION**. **Not LIVE. Do not implement from this record.** Storyboard is **not** automatically launch-blocking. Preview/Premium differentiation is the **LAUNCH PRODUCT GATE** (see **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**).

Storyboard is **not** intended to replace the WOW factor of video.

Its purpose is:

**creative approval before expensive video generation.**

Director should translate the customer's intent into a simple visual plan.

The customer should be able to understand and correct, before expensive AI video generation:

* concept
* opening
* environment
* people / characters
* product treatment
* emotional tone
* hero moment
* general narrative
* closing direction

The customer should **NOT** need to understand:

* prompting
* Veo
* models
* seeds
* camera terminology
* production profiles
* AI architecture

Desired interaction:

**“This is what Metaprom understood. Is this what you want?”**

Customer:

* approves
  or
* asks Director for simple corrections

Storyboard therefore functions as both:

1. customer creative control
2. economic guard rail against unnecessary video generation

Related historical backlog item **Story Planner** (Product Backlog MEDIUM) is **not** this Storyboard decision and is **not** authorization to build either.

### 6. Motion Preview experiment — REJECTED

**Status:** **REJECTED EXPERIMENT**. Do not implement unless future evidence materially changes this conclusion.

During this product discussion, a proposed intermediate deterministic **Motion Preview** was tested using an existing Premium pizza image.

Three approximately 2-second non-generative variants were created:

* cinematic push-in
* push-in + camera drift
* premium motion treatment

using deterministic image/video manipulation rather than Veo.

**Result: REJECTED AS A PRODUCT STAGE.**

Reason: the result reads primarily as zoom/pan applied to a still photograph. It does **not** create sufficient perception that the customer's asset has genuinely become a new video production. It does not preserve enough WOW factor to justify another funnel step.

Therefore the preferred architecture must **NOT** currently include:

```
Storyboard
  → deterministic Motion Preview
  → AI Preview
```

Instead:

```
Storyboard
  → AI Video Preview
```

### 7. AI Video Preview — purpose

**Status:** **APPROVED PRODUCT DIRECTION** for future Preview meaning. **LIVE** current Preview/Teaser behavior is unchanged.

The AI Video Preview is where the initial video WOW should occur.

Its purpose is **NOT** to give away a shortened version of the complete Premium Commercial.

Its purpose is to prove:

**“Metaprom can actually turn MY asset into a living professional production.”**

The Preview should create genuine new visual information / motion that could not be achieved by simple pan/zoom.

Examples may include:

* people entering a room
* family / lifestyle activity
* dog moving through scene
* product interaction
* food motion / steam
* clothing movement
* cinematic environmental change
* meaningful generated camera / action behavior

The AI Preview should leave the customer thinking:

**“I want to see the complete commercial.”**

not:

**“I already saw the commercial; the paid version is merely longer.”**

This explicitly addresses a weakness in the **LIVE** product:

**the current Preview and Premium Commercial are not differentiated enough in perceived value.**

This weakness is now a **LAUNCH PRODUCT GATE**: it must be established and validated before broad paid acquisition / serious public sales push. Canonical expansion (Preview = proof/WOW; Premium = the finished product; restrict narrative quantity, not quality): **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

The standing product rule (“The Premium commercial must always feel significantly more valuable than the Preview”) remains in force. The finding is that current Preview/Premium do not yet create a sufficiently clear product gap. Future architecture must create a much clearer gap. That is **not** a license to change live Preview/Premium in this task. The short ~1–1.5s Preview is **not** live.

### 8. Preview duration — reconciled (same-day micro-update)

**Status:** Native Veo minimum = **WORKING TECHNICAL FINDING**. Customer-facing length = **APPROVED UX DIRECTION, REQUIRES TESTING**. **Not LIVE. Do not implement duration, trim, or Preview prompt changes from this record.**

This section previously left Veo minimum duration and the approximately 2-second Preview question fully **OPEN**. That is **superseded** by **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

**Working technical finding (Veo 3.1 Fast path):**

**minimum generated duration = 4 seconds**

Metaprom should **NOT** assume that requesting a native 1-second, 1.5-second, or 2-second Veo generation is available. The underlying generation may need to be 4 seconds even when the customer-facing Preview is substantially shorter.

**Architecture distinction (approved, not implemented):**

**Generation duration ≠ customer-facing Preview duration.**

Metaprom does **NOT** need to expose the entire generated Veo clip merely because the provider generated 4 seconds.

Preferred product direction:

**Generate minimum viable Veo source clip → deterministically extract/cut the strongest short proof moment → expose only that short customer-facing Preview.**

Metaprom already has deterministic FFmpeg capabilities, so trimming is conceptually straightforward. This is a product architecture decision, **not** an implementation instruction.

**Customer-facing UX target (requires testing, not live):**

**approximately 1–1.5 seconds visible to the customer**

with an approximate maximum target around **2 seconds** if testing demonstrates that more time is required.

The objective is **NOT** to summarize the Premium Commercial. The objective is to show **ONE unmistakable piece of genuine generated action**, then end. Deliberate early cut is a product feature. Unused generated duration is acceptable production overhead if economics support it. Do **not** show all generated seconds merely because they exist.

Core principle:

**Restrict narrative quantity, not quality.**

The Preview should be visually excellent — **spectacular but incomplete** — not intentionally ugly, low-quality, or weak to protect Premium.

Future Preview prompts should target an **immediate proof action**, not a miniature complete commercial. Exact prompt implementation remains future work.

**LIVE / historical documented characteristic:** Preview Policy and earlier commercial-tier language still describe the current teaser as approximately **3–5 seconds**. That remains the documented LIVE/historical target. It is **unchanged**. The short Preview is **not** already implemented.

Canonical expansion: **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

### 9. Preview Pro — optional creative exploration

**Status:** **APPROVED PRODUCT DIRECTION** (concept). **Not LIVE.** Exact name is **not** final. Do not implement from this record.

Customers who want to explore additional creative directions may optionally purchase additional AI previews.

Working concept name: **Preview Pro**.

Preview Pro is for **EXPLORATION**, not **CORRECTION** (see §3).

A customer could use Director between previews to request another creative direction.

Example:

* Preview A: elegant / premium
* Preview B: family / lifestyle
* Preview C: night / dramatic
* Preview D: energetic / TikTok

This allows customers who want greater creative exploration to do so without Metaprom funding unlimited expensive generations.

### 10. Preview Pro payments become project credit

**Status:** **APPROVED PRODUCT DIRECTION** (major commercial concept). Exact accounting / payment architecture is **OPEN** and **not yet designed**. Do not implement from this record.

**Money paid for optional Preview Pro generations should be credited toward the final Premium Commercial for THAT SAME PROJECT.**

Conceptually:

```
Premium Commercial price
minus eligible paid Preview Pro amounts for that project
========================================================
remaining amount to unlock the Premium Commercial
```

The customer should feel:

**“The money I spend exploring is not lost. It is advancing me toward my final commercial.”**

Guard rails:

* credit belongs to the **same** project / commercial
* it is **not** general account credit
* it is **not** transferable to another project
* credit cannot exceed the final eligible commercial price
* it must never produce a negative purchase price
* consumed previews remain consumed
* this is **purchase credit**, **not** a promise that preview fees are independently refundable
* exact accounting / payment architecture is **not** yet designed

### 11. First Preview / Free WOW — OPEN

**Status:** **OPEN / REQUIRES VALIDATION**. Do not invent a free-preview allowance.

Metaprom wants to preserve the powerful acquisition moment:

customer uploads / takes a normal photo → minutes later sees that **THEIR OWN** asset has become genuine video.

Possible future model (not final):

* Storyboard available before video generation
* first AI Video Preview may be included / free after signup
* additional creative exploration uses paid Preview Pro
* paid Preview Pro amounts credit toward the same Premium project

This is **not** final until real Veo generation economics are validated.

**LIVE** current product still includes the existing Studio teaser / Preview as currently implemented. This OPEN item is about the **future** first-preview commercial model, not a change to live teaser behavior.

### 12. Premium Commercial — clear value distance

**Status:** **APPROVED PRODUCT DIRECTION** for the desired distinction. This distinction is now a **LAUNCH PRODUCT GATE**. Premium as purchased complete commercial remains **LIVE**. Future Preview/Premium gap is not yet implemented beyond current Studio. The short proof Preview is **not** live.

**AI VIDEO PREVIEW** = **PROOF + WOW** — very short; one genuine generated action; high visual quality; intentionally incomplete; does not tell the complete advertising story.

Customer reaction sought: **“Wow. It really did that with my image. I want to see the commercial.”**

**PREMIUM COMMERCIAL** = **THE PRODUCT** — complete commercial and narrative; full intended duration; Commercial Fidelity; Biblioteca; download; sharing; correction/rework philosophy.

Customer reaction sought: **“This is the finished commercial I paid for.”**

The Premium must **NOT** feel like **“the same Preview, only longer.”**

Public-share growth rules remain **LIVE**: Preview belongs to Metaprom; Premium belongs to the customer; Preview is never downloadable; share distributes a Metaprom page. See GTM §13 and **Preview Policy**. Full launch-gate record: **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)** §5.

### 13. Economic philosophy

**Status:** **APPROVED PRODUCT DIRECTION**. Aligns with GTM §8 (results pricing, retries as production cost, Rescue to reduce cost variance). Does not change live prices.

Public pricing research indicates Veo 3.1 Fast may be economically compatible with a 4-second source + short exposed Preview, with a working **external** reference of approximately **USD $0.08 per generated second** for Fast 720p without audio (~**USD $0.32** for a 4-second minimum source generation).

Do **NOT** represent this as Metaprom's audited internal production cost. Actual Vertex billing for the production account remains **OPEN / unverified**. See **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

Metaprom should optimize economics across the customer portfolio, not require every individual generation to have identical margin.

Some customers will require:

* minimal generation
* some will require retries
* some will require repair
* exceptional cases may require substantial rework
* rare cases may require refund

That variance is acceptable if overall unit economics remain healthy.

The product should use:

* Director
* Storyboard
* approval
* short Preview
* Commercial Rescue
* deterministic repair
* selective regeneration
* human fallback

to reduce expected production cost while maintaining a strong customer promise.

The goal is **NOT**:

**minimize generations at any cost.**

The goal is:

**deliver a satisfactory product while controlling expected production cost intelligently.**

### 14. GTM priority must not change

**Status:** Operating rule. **LIVE** execution compass remains the GTM launch checklist.

This discussion was a necessary product-architecture detour.

**STOP THE PRODUCT-ARCHITECTURE DETOUR.**

It must **NOT** restart broad development.

The existing one-page GO TO MARKET checklist remains the execution compass.

After documenting these decisions — including the same-day duration / launch-gate micro-update — development returns immediately to the GTM launch-hardening sequence.

Do **not** implement Storyboard, Preview Pro, duration/trim, or Preview prompts merely because they are now documented.

Do **not** expand scope.

**Preview/Premium differentiation = LAUNCH PRODUCT GATE.** It must be resolved/validated before broad paid acquisition / serious public sales push. Do **not** make Storyboard, Preview Pro, or project-credit accounting automatically launch-blocking merely because they are related to the future architecture.

Do **not** delay launch for nonessential architecture work unless later analysis determines a specific element is required for safe / commercially viable launch.

Core operating rule until launch:

**If it is on the GTM launch checklist, do it.**

**If it is not on the checklist and is not a newly discovered real P0/P1 blocker, defer it until after launch.**

See **NEXT SESSION START HERE**.

### 15. Open questions — unresolved

**Status:** mixed. Do **not** resolve remaining items by assumption. Duration questions previously listed here are **superseded** by **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

**RESOLVED / WORKING TECHNICAL FINDING:**

* native generation minimum: **4 seconds** (currently relevant Veo 3.1 Fast path)

**APPROVED UX DIRECTION, REQUIRES TESTING (not live):**

* expose approximately 1–1.5 seconds
* maximum target approximately 2 seconds if needed
* deliberately trim generated source
* one immediate generated action
* Preview = proof/WOW, not mini-commercial

**STILL OPEN:**

1. Actual Vertex billing / cost for the production account (external Fast research is **not** audited internal cost).
2. Final free Preview allowance (whether first AI Preview is free, signup-gated, included, or otherwise controlled).
3. Preview Pro price.
4. Preview Pro model / duration / quality.
5. Exact same-project credit accounting architecture.
6. Abuse protection.
7. Storyboard visual implementation and generation cost (Storyboard is **not** automatically launch-blocking).
8. Exact correction / rework operational limits.
9. Advertising-image and other non–Premium-Commercial refund distinctions beyond the published Premium delivery-failure guarantee. Premium Commercial delivery-failure refund language is **published** (GTM #5.3, August 20, 2026).

Preview/Premium differentiation is a **LAUNCH PRODUCT GATE**, not merely an open optimization.

### 16. Reconciliation with existing Preview / Teaser philosophy

Where earlier MASTER language conflicts with this update on **future Preview architecture or commercial-results philosophy**, this update governs future direction. **LIVE** Preview/Teaser behavior is unchanged.

| Earlier language | How to read it now |
| --- | --- |
| Preview is approximately 3–5 seconds (Preview Policy, commercial tiers, RC1.3.5 Preview vs Premium) | **LIVE / historical documented characteristic.** Future direction: generate ~4s Veo source, expose ~1–1.5s (max ~2s if testing requires). **Not live.** See §8 and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Do not change live duration from this record. |
| Preview exists only to create desire / attract new users; “the Preview does not sell a video; it sells the next user.” | **Still true for public share / Growth Engine.** In-Studio AI Video Preview also has a second job: **PROOF + WOW** — prove that **this customer's asset** became a living production, and create desire for the complete Premium — without giving the complete commercial away. Growth-asset rules (never downloadable, Metaprom-owned, share page) remain **LIVE**. |
| Biblioteca story: Original Photo → Premium Image → Free Teaser → HD Commercial | **LIVE** current portfolio storytelling. Preferred future funnel is §4 (**APPROVED PRODUCT DIRECTION**, not live). |
| Free Teaser as a given product stage | **LIVE** current teaser remains as shipped. Whether the **future** first AI Video Preview is free / included / signup-gated is **OPEN** (§11). |
| “The Premium must never feel like a slightly longer Preview” / must feel significantly more valuable | **Still in force.** Now a **LAUNCH PRODUCT GATE**. **LIVE** Preview and Premium are **not yet differentiated enough**. Closing that gap is future architecture, not a live change in this task. Premium must not feel like “the same Preview, only longer.” |
| Current Studio: Director integrated after Preview and Premium generation | **LIVE** current Director timing. Preferred funnel places Director (and Storyboard approval) **before** expensive video generation. Not implemented. |
| GTM §3: do not convert production responsibility into unlimited revisions or refund-for-any-reason | **Still in force as a boundary.** The Premium Commercial delivery-failure refund is now a **published customer guarantee** (GTM #5.3, August 20, 2026). It remains scoped: within the purchased Premium Commercial, not unlimited revisions, not a change-of-mind refund after satisfactory delivery. |
| Product Backlog MEDIUM “Story Planner” | Historical / backlog. **Not** the §5 Storyboard decision. Do not implement Storyboard from backlog language. |

**Not LIVE (do not ship from this record):** Storyboard, Preview Pro, same-project Preview credit accounting, Motion Preview, refunds, 1–1.5s customer-facing Preview, 4s-source trim pipeline, Preview-specific immediate-action prompts, free-preview allowance.

---

## MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)

*Documentation-only micro-update. Reconciles Veo generation minimum, customer-facing Preview duration, deliberate trim, Preview prompt philosophy, working (unverified) Fast economics, and Preview/Premium differentiation as a **LAUNCH PRODUCT GATE**. Does **not** change LIVE Studio, current teaser/preview behavior, Stripe, prices, or GTM execution order. Does **not** implement Storyboard, Preview Pro, duration changes, trimming, or prompt changes.*

*Amends **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** on duration, economics status, and launch gating. Funnel, Storyboard purpose, rejected Motion Preview, Preview Pro exploration + same-project credit, Correction vs Exploration, and results-not-generations philosophy remain as recorded there.*

*After this record: **STOP THE PRODUCT-ARCHITECTURE DETOUR.** Return to the GTM launch-hardening checklist. See **NEXT SESSION START HERE**.*

### Status legend (this update)

| Label | Meaning |
| --- | --- |
| **LIVE** | Current product as shipped. This update does not change live behavior. |
| **WORKING TECHNICAL FINDING** | Current working technical conclusion. Not an implementation instruction. Not a claim that live Preview already uses this. |
| **APPROVED UX DIRECTION, REQUIRES TESTING** | Preferred customer-facing product direction. Not live. Duration/trim/prompt are not implemented from this record. |
| **LAUNCH PRODUCT GATE** | Must be established and validated before broad paid acquisition / serious public sales push. Not authorization to implement in this task. Not a reason to auto-block launch with Storyboard / Preview Pro / project-credit work. |
| **APPROVED PRODUCT DIRECTION** | Already recorded future architecture. Still not live. Do not implement from this record. |
| **OPEN / REQUIRES VALIDATION** | Unresolved. Do not invent a price, allowance, legal term, or audited cost. |

### 1. Veo generation minimum

**Status:** **WORKING TECHNICAL FINDING**. **Not LIVE. Do not implement from this record.**

For the currently relevant **Veo 3.1 Fast** generation path, the working technical finding is:

**minimum generated duration = 4 seconds**

Metaprom therefore should **NOT** assume that requesting a native 1-second, 1.5-second, or 2-second Veo generation is available.

The underlying generation may need to be **4 seconds** even when the customer-facing Preview is substantially shorter.

This finding **resolves** the prior OPEN question of native Veo minimum duration. It does **not** change the current implementation.

### 2. Generation duration ≠ customer-facing Preview duration

**Status:** **APPROVED PRODUCT DIRECTION** (product architecture). **Not implemented. Do not implement from this record.**

Metaprom does **NOT** need to expose the entire generated Veo clip merely because the provider generated 4 seconds.

Preferred product direction:

**Generate minimum viable Veo source clip → deterministically extract/cut the strongest short proof moment → expose only that short customer-facing Preview.**

Metaprom already has deterministic FFmpeg capabilities, so trimming is conceptually straightforward.

This is a product architecture decision, **not** an implementation instruction in this task.

### 3. Customer-facing Preview target

**Status:** **APPROVED UX DIRECTION, REQUIRES TESTING**. **Not LIVE.** Do not treat approximately 1–1.5 seconds as already implemented.

Preferred UX target:

**approximately 1–1.5 seconds visible to the customer**

with an approximate **maximum target around 2 seconds** if testing demonstrates that more time is required.

This duration is deliberately short.

The objective is **NOT** to summarize the Premium Commercial.

The objective is to show **ONE unmistakable piece of genuine generated action.**

Examples:

* human hand takes the customer's product
* pizza slice lifts and cheese stretches
* person enters the customer's room
* family begins interacting in the space
* dog moves through the scene
* model begins using/wearing the product
* food visibly comes alive through real generated action

The customer only needs enough evidence to conclude:

**“Metaprom actually turned MY image/product into video.”**

Then the Preview should end.

**LIVE / historical documented characteristic:** current teaser remains approximately **3–5 seconds** (Preview Policy / earlier commercial-tier language). Unchanged.

### 4. Deliberate early cut is a product feature

**Status:** **APPROVED PRODUCT DIRECTION**. **Not LIVE.**

The short cut is intentional.

Metaprom may internally generate 4 seconds but deliberately expose only approximately 1–1.5 seconds.

The unused generated duration is acceptable production overhead if the economics support it.

Do **NOT** optimize the Preview by showing all generated seconds merely because they already exist.

Showing more can reduce the perceived-value gap between Preview and Premium.

The customer-facing Preview should end while curiosity remains.

Core principle:

**Restrict narrative quantity, not quality.**

The Preview should be visually excellent.

It should **NOT** be intentionally ugly, low-quality, or weak merely to protect the Premium product.

Instead, it should be:

**spectacular but incomplete.**

### 5. LAUNCH PRODUCT GATE — PREVIEW/PREMIUM DIFFERENTIATION

**Status:** **LAUNCH PRODUCT GATE**. Acknowledged LIVE weakness. Future architecture is **APPROVED PRODUCT DIRECTION** and **not implemented**. Do not change live Preview/Premium in this task.

The current live product has an acknowledged weakness:

**Preview and Premium are too similar in perceived product value.**

This is no longer merely a future optimization.

Before **broad paid acquisition / serious public sales push**, Metaprom must establish and validate a materially clear distinction between:

#### AI VIDEO PREVIEW

Purpose:

**PROOF + WOW**

* very short
* one genuine generated action
* proves transformation capability
* high visual quality
* intentionally incomplete
* does not tell the complete advertising story
* should create desire to continue

Customer reaction sought:

**“Wow. It really did that with my image. I want to see the commercial.”**

#### PREMIUM COMMERCIAL

Purpose:

**THE PRODUCT**

* complete commercial
* complete narrative
* full intended duration
* multiple meaningful beats where appropriate
* polished production
* Commercial Fidelity
* exact deterministic copy/logo/CTA where applicable
* Biblioteca
* download
* sharing
* correction/rework philosophy

Customer reaction sought:

**“This is the finished commercial I paid for.”**

The Premium must **NOT** feel like:

**“the same Preview, only longer.”**

**Launch-gate scope:** this gate is **Preview/Premium differentiation**. It does **not** automatically make Storyboard, Preview Pro, or same-project credit accounting launch-blocking. The immediate execution compass remains the GTM checklist. This gate must be resolved/validated before broad sales push; it is **not** authorization to begin implementation in this session.

### 6. Storyboard relationship

**Status:** **APPROVED PRODUCT DIRECTION** (funnel). **Not LIVE. Do not implement Storyboard from this record.**

Preserve the approved conceptual funnel:

```
CUSTOMER ASSET
  → DIRECTOR
  → STORYBOARD / CREATIVE APPROVAL
  → SHORT AI VIDEO PREVIEW
  → PREMIUM COMMERCIAL
```

Storyboard remains the economic/creative guard rail **BEFORE** expensive video generation.

Short AI Preview remains the WOW/proof stage.

Premium remains the actual purchased deliverable.

Deterministic Motion Preview remains **REJECTED**.

### 7. Preview generation prompt philosophy

**Status:** **APPROVED PRODUCT DIRECTION**. Exact prompt implementation remains **future work**. **Do not implement from this record.**

Future Preview generation should be prompted specifically for an **immediate proof action**.

Do **NOT** design Preview prompts as miniature complete commercials.

The important generated action should occur as early as practical in the underlying Veo generation so that Metaprom can extract a compelling approximately 1–1.5-second proof moment.

Example:

Instead of asking Veo to create a complete pizza commercial:

**Prompt toward immediate action: a human hand immediately reaches for and lifts a pizza slice, producing visible cheese stretch.**

The purpose is to maximize proof/WOW per exposed second.

### 8. Economic status

**Status:** working **external** cost research. **Not** audited internal production cost. Production-account billing remains **OPEN / REQUIRES VALIDATION**.

Public pricing research indicates that Veo 3.1 Fast video generation may be economically compatible with this architecture, with a working external reference of approximately:

**USD $0.08 per generated second for Fast 720p video without audio**

which would imply approximately:

**USD $0.32 for a 4-second minimum source generation**

Do **NOT** represent this as Metaprom's audited internal production cost yet.

Actual Vertex billing for the production account must still be verified before final pricing/allowance decisions.

### 9. Preview Pro remains separate

**Status:** **APPROVED PRODUCT DIRECTION** (unchanged). **Not LIVE. Do not implement from this record.**

Do not change the previously approved Preview Pro philosophy.

Preview Pro remains:

**optional paid creative EXPLORATION**

not payment for Metaprom corrections.

Paid Preview Pro amounts are intended to become credit toward the Premium Commercial of the **SAME** project.

### 10. Question status after this micro-update

**RESOLVED / WORKING TECHNICAL FINDING:**

* native generation minimum: **4 seconds**

**APPROVED UX DIRECTION, REQUIRES TESTING:**

* expose approximately **1–1.5 seconds**
* maximum target approximately **2 seconds** if needed
* deliberately trim generated source
* one immediate generated action
* Preview = proof/WOW, not mini-commercial
* restrict narrative quantity, not quality — spectacular but incomplete

**STILL OPEN:**

* actual production-account billing/cost
* final free Preview allowance
* Preview Pro price
* Preview Pro model/duration
* exact same-project credit accounting
* abuse protection
* Storyboard implementation
* correction/rework operational limits
* refund terms

### 11. GTM priority after this micro-update

**STOP THE PRODUCT-ARCHITECTURE DETOUR.**

The one-page GO TO MARKET launch-hardening checklist is again the next-session execution compass. See **NEXT SESSION START HERE**.

Preserve:

**Preview/Premium differentiation = LAUNCH PRODUCT GATE**

meaning it must be resolved/validated before broad paid acquisition / serious public sales push.

Do not make Storyboard, Preview Pro, or project-credit accounting automatically launch-blocking merely because they are related to the future architecture.

**Not LIVE (do not ship from this record):** short 1–1.5s customer-facing Preview, Veo 4s source + FFmpeg trim pipeline, Preview-specific immediate-action prompts, Storyboard, Preview Pro, same-project credit accounting, refunds, free-preview allowance.

---

## Historical Milestones

*The sections below record prior sprint and RC milestones. Where they conflict with **Current State**, **NEXT SESSION START HERE**, or **MASTER UPDATE — Session Close (September 2, 2026)**, the September 2, 2026 session close governs. Where they conflict only with **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**, **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**, or **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**, those August records govern for their specific domains unless superseded by September 2, 2026.*

*In particular, treat as historical rather than current truth: Stripe remains Test Mode / Live not enabled; Dual Creation as the next BUILD sprint; Advertising Image journey as the single active blocker; Share Experience as launch-complete or undifferentiated launch P0 without noting Anonymous Share is OFF; August GTM launch-hardening checklist as active execution compass; Metaprom as primarily an AI Commercial generator; older “current active objective” and June/July 2026 “current priorities” tables; production commit `078da054` as current.*

## MASTER UPDATE — Stripe V1 E2E + Dual Product Architecture (August 2026)

*HISTORICAL — Test Mode era and Dual Creation as the next BUILD sprint. Package catalog, entitlement architecture, fulfillment security (`grant_package_entitlement` server-only), Dual Creation journey design, and the Test Mode Commercial E2E remain valid historical record. Current operating truth (Stripe Live, GTM, Share P0, factory positioning) is **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

*Supersedes earlier Revenue Sprint / Stripe soft-launch status for the Test Mode verification milestone. Does **not** supersede the August 18–19, 2026 GTM update.*

### 1. Stripe V1 — Historical Test Mode Verified State

Stripe V1 reached successful **real-domain Test Mode E2E validation** on:

[https://www.metaprom.com](https://www.metaprom.com)

**Verified Commercial E2E:**

```
www.metaprom.com
→ Studio / Commercial flow
→ Stripe Checkout
→ 1 Commercial
→ MXN $180
→ Test Mode payment
→ successful return
→ server-side fulfillment
→ entitlement grant
→ current-project consumption
→ success
```

The manual E2E payment using Stripe Test Mode succeeded.

**Historical status at the time of this update:** Stripe remained TEST MODE; Live Mode was not yet enabled.

**Superseded August 18, 2026:** Stripe Live Mode is operational. See **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §§14–16. Do **not** treat “Stripe remains TEST MODE” as current truth.

### 2. Stripe V1 Packages

#### Commercial packages

| Package | Price |
| --- | --- |
| 1 Commercial | MXN $180 |
| 5 Commercials | MXN $640 |
| 10 Commercials | MXN $990 |
| 20 Commercials | MXN $1,780 |

#### Advertising Images

| Package | Price |
| --- | --- |
| 10 Images | MXN $99 |
| 25 Images | MXN $199 |
| 50 Images | MXN $349 |
| 100 Images | MXN $599 |

All **8** package Price IDs existed in Stripe Test Mode at the time of this update. Package prices remain the current catalog unless separately changed.

Card and OXXO were available in Test Checkout.

Commercial package checkout passed production-domain Test Mode validation.

**Historical:** Advertising Image package Stripe checkout infrastructure existed, but full product E2E was **not** yet considered complete because Dual Creation UX/product orchestration had to be built first.

**Superseded August 18–19, 2026:** Dual Creation is the current dual-product foundation; Live Advertising Image fulfillment is evidenced by purchase #34. Unknown-customer E2E remains a launch-readiness audit item, not a Test Mode / BUILD-phase stopping point. See the GTM update.

### 3. Legacy Stripe Checkout Removed

The old single Commercial checkout:

* product: `commercial-video`
* env: `STRIPE_PRICE_ID_COMMERCIAL_VIDEO`
* price: MXN $149

was identified as a legacy runtime path and **removed** from the active Studio checkout architecture.

Studio now routes through Stripe V1 package checkout using:

```
productKey: commercial_1
```

The legacy **$149** Stripe Price must **NOT** be restored.

Historical production commit after this fix and entitlement fix:

`1378eb4fbd349ac4fddc03b8f09b4abeff805c1e`

Later production commit cited August 18, 2026 (Commercial Rescue closeout / Stripe Live audit): `078da0545d086b53e46fcea9cd59b4843c9dd6cb`

### 4. Entitlement Architecture

Commercial and Advertising Image entitlements are **separate**.

* Commercial package purchase → grants **commercial** entitlement balance
* Advertising Image package purchase → grants **advertising_asset** balance

#### Advertising Image consumption model

1 new standalone finished Advertising Image → consumes exactly **1** `advertising_asset`.

**Billing boundary:** first persistence of a new finished/deliverable Advertising Image.

**Do NOT charge:**

* internal AI generation attempts
* AI retries
* reasonable refinements of an already-consumed `asset_id`
* internal images generated as part of Commercial production

Consumption is **idempotent**.

Concurrent requests cannot spend the same last entitlement twice.

No negative balances.

### 5. Supabase Fulfillment Fix

Verified security architecture for `grant_package_entitlement`:

| Caller | Result |
| --- | --- |
| `anon` | DENIED |
| `authenticated` | DENIED |
| `service_role` | ALLOWED |

`grant_package_entitlement` is **server-only**.

The post-payment fulfillment bug was caused by the authenticated SSR client calling `grant_package_entitlement`.

**Fixed** by using `createAdminClient()` / `service_role` for trusted payment fulfillment.

Do **NOT** broaden database permissions.

Purchase fulfillment remains idempotent.

### 6. Important Product Architecture Finding (historical)

*HISTORICAL observation that Dual Creation was designed to correct. Do not present as current stopping point. Unknown-customer E2E remains a launch audit item.*

Then-current UX was originally designed around Commercial generation.

This created a structural problem for Advertising Images.

**Observed behavior at the time of this update:**

```
User uploads/provides an image
→ Premium Image can be generated successfully
→ Premium Image can appear in Biblioteca
→ UX then assumes the user wants a Commercial
→ asks "Where will you publish this commercial?"
→ destinations are video/commercial oriented
→ flow proceeds toward video
→ payment path naturally offers Commercial purchase
```

Therefore:

**Then:** Advertising Images were technically supported by generation, persistence, Stripe packages, and entitlements, but were **not** yet exposed as a coherent standalone customer journey.

This was **not** a Stripe problem. It was a **product/UX orchestration** problem.

**August 18–19, 2026:** Dual Creation is the current dual-product foundation; Live Advertising Image fulfillment is evidenced by purchase #34. Full unknown-customer E2E is a GTM launch-readiness audit, not this Test Mode finding.

### 7. Approved Direction — Director as Central Orchestrator

The Creative Director becomes the **primary intelligent interface and commercial orchestrator** for Metaprom.

The user should **NOT** need to understand Metaprom's internal engines or manually navigate separate technical workflows.

Director should understand user intent and route the request.

**Examples:**

| User intent | Route |
| --- | --- |
| "Quiero un comercial para TikTok." | Commercial route |
| "Quiero mejorar esta foto para Mercado Libre." | Advertising Image route |
| "Hazme un flyer." | Advertising Image / creative asset route |
| "Necesito anunciar este producto." | Director may clarify the desired deliverable when necessary |

When intent is ambiguous, Director may ask a simple high-level question:

> ¿Qué quieres crear?
>
> - Un Comercial
> - Una Imagen Publicitaria

Avoid exposing unnecessary technical complexity.

### 8. Dual Creation Architecture — Approved Journey Design (historical “next sprint”)

*Historical as the next BUILD sprint. Journey design below remains the Dual Creation foundation. Current active objective is GO-TO-MARKET, not Dual Creation as a BUILD sprint. See the GTM update.*

**Then-next major product sprint:**

> METAPROM DUAL CREATION ARCHITECTURE
> COMMERCIALS + ADVERTISING IMAGES

**Goal:** one intelligent entry point through Director, with separate downstream product journeys.

#### Commercial route

```
Director
→ input/photo
→ Premium Image / commercial preparation
→ destination
→ format
→ video generation
→ preview
→ Commercial entitlement/payment
→ HD/final commercial
→ Biblioteca
```

#### Advertising Image route

```
Director
→ input/photo
→ understand desired image asset
→ generate Premium Advertising Image
→ refinements if requested
→ finalize image
→ Advertising Image entitlement/payment
→ Biblioteca
```

The Advertising Image route **MUST** terminate as an image product.

It must **NOT** automatically proceed into:

* video generation
* commercial destination selection
* Veo
* video duration
* teaser
* Commercial HD checkout

### 9. Advertising Image Destinations / Intent

Director should understand or ask about image purpose when relevant.

Possible image intents include:

* commercial product photography
* Amazon
* Mercado Libre
* social media
* flyer
* poster
* menu
* banner
* website
* catalog
* other advertising asset

These should guide composition, aspect ratio, copy, and output.

Do **NOT** turn this into a large technical form.

Director should absorb the complexity.

**August 18–19, 2026:** this destination/intent list is the foundation for **destination-aware production** (Amazon, Mercado Libre, Shopify/ecommerce, Real Estate, social). Future commercial packs are roadmap only and must **not** be implemented before launch. See GTM §7.

### 10. Director as Commercial Advisor

Director should also become responsible for product/package discovery.

**Current weakness:** a user may enter wanting one Commercial or one Image and never discover the available package menu.

Director should intelligently expose or recommend packages when commercially appropriate.

**Examples:**

* If user needs one Commercial → may offer 1 Commercial or explain savings from larger packages
* If user indicates recurring image needs → recommend 10 / 25 / 50 / 100 Image package appropriately

Director should act as a helpful seller/advisor, **not** an aggressive popup system.

The `/planes` page remains the canonical package catalog, but Director can surface relevant package options and route users there or initiate the appropriate checkout.

### 11. Next Validation Order (historical — Test Mode era)

*HISTORICAL sequence from the Test Mode era. Do not execute as current work.*

Then-current instruction: do **not** move Stripe to Live Mode yet.

Then-next:

1. **A.** Build Dual Creation Architecture
2. **B.** Complete standalone Advertising Image customer journey
3. **C.** Test Advertising Image E2E:
   * purchase 10 Images for MXN $99
   * → balance 10
   * → create/finalize one standalone image
   * → consume exactly 1
   * → resulting balance 9
   * → Biblioteca delivery
4. **D.** Test OXXO asynchronous E2E behavior
5. **E.** Final payment/entitlement regression
6. **F.** Move Stripe to Live Mode

**Superseded August 18, 2026:** Stripe Live is enabled. Purchase #34 recovered through `checkout.session.async_payment_succeeded`. Current order is **NEXT SESSION START HERE**.

### 12. Live Mode Plan (historical checklist)

*HISTORICAL plan written before Live enablement. Several items were subsequently executed. Canonical Live webhook URL is now `https://www.metaprom.com/api/payments/webhook`.*

After Test Mode validation is complete:

* activate/verify Stripe account for real payments
* create equivalent 8 Live Mode Prices
* configure `sk_live_` securely in Production
* configure 8 Live Price IDs
* configure Live webhook secret/endpoint
* verify card + OXXO availability in Live
* perform controlled small real payment
* verify entitlement fulfillment
* launch

Test and Live credentials must **never** be mixed.

### 13. Product Principle (historical — Dual Creation era)

*HISTORICAL positioning from the Dual Creation / Test Mode update. Superseded as current commercial definition by the GTM factory positioning: Metaprom is an advertising production platform; the delivered advertising asset is the product; the Director is Production Director.*

Metaprom is evolving from:

> "AI Commercial generator"

toward:

> "AI advertising asset platform orchestrated by an intelligent Creative Director."

Director determines what the customer is trying to create and coordinates the correct generation, refinement, purchase, and delivery flow.

Preserve:

> No barriers, no nonsense.

Do not make the user learn the architecture.

### 14. Stopping Point (historical — Test Mode era)

*HISTORICAL stopping point. Superseded August 18–19, 2026.*

**Commercial Stripe V1 (then):**

E2E TEST MODE — VERIFIED SUCCESSFULLY ON www.metaprom.com

**Advertising Image infrastructure (then):**

* generation — available
* persistence — available
* package catalog — available
* Stripe Test checkout — available
* entitlements — implemented
* idempotent consumption — implemented
* hard entitlement gate — implemented

**Advertising Image customer journey (then):**

NOT COMPLETE

**Then-next work:**

Dual Creation Architecture + Director orchestration.

---

## MASTER UPDATE — RC1.4 — Stripe & Soft Launch (July 2026)

*Historical — RC1 commercial foundation. Superseded by later Stripe V1 Test Mode verification and, for current operating truth, by **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

### RC1.4

#### Transition to Stripe & Soft Launch

##### Project Status

Metaprom officially completed the **Infrastructure Phase** and entered product-focused development.

##### Completed

* Enhancement
* Preview Generation
* Premium Generation
* Biblioteca
* Persistence
* Workflow Layer
* Public Commercial Pages
* Growth Engine Foundation
* Product Stabilization
* Share Experience (functional foundation)

##### Share

*HISTORICAL RC1.4 completeness. As of August 18–19, 2026, Share is launch-critical P0 requiring final hardening/validation. See **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §13.*

The Share Experience was considered **functionally complete** as an RC1 foundation.

Verified at that time:

* Share button on Preview
* Share button on Biblioteca
* `share_slug` persistence
* Public Commercial page
* Video playback
* Streaming through signed URLs
* CTA "Create yours free"
* Navigation
* Smoke Test

##### Soft Launch Strategy

Deploy the current product. Replace the historical version on metaprom.com. Begin a **Soft Launch** — collect feedback from real users, improve based on real usage, delay paid marketing until the product consistently feels production-ready.

---

## MASTER UPDATE — RC1.3.5 — Product Stabilization & Growth Engine Foundation (July 2026)

*Historical — superseded by **MASTER UPDATE — RC1.4 — Stripe & Soft Launch (July 2026)** for current RC1 status, active objective, and development workflow. Supersedes **MASTER UPDATE — RC1.3.5 Product Review (CEO Review) (July 2026)** for Product Stabilization phase context, Growth Engine foundation, Public Commercial experience, smoke test philosophy, navigation philosophy, error experience, and Developer QA Mode direction.*

### RC1.3.5

#### Product Stabilization Phase

##### Project Status

Metaprom has officially entered the Product phase.

The platform is no longer focused on making AI work.

The core platform is already functional:

* Enhancement
* Preview Video
* Checkout
* Premium Generation
* Biblioteca
* Persistence
* Stripe-ready architecture
* Workflow abstraction
* Public Commercial Pages
* Growth Engine foundation

The primary objective is no longer adding features.

The primary objective is making the existing product stable and delightful.

##### Product Philosophy

Technology is no longer the product.

Technology is infrastructure.

Metaprom sells:

* transformation
* creative direction
* simplicity
* growth
* product experience

Not AI.

Official reminder:

> Demonstrate first.
> Explain later.

##### Growth Engine Philosophy

The Preview officially becomes a permanent marketing asset.

The Preview:

* lives permanently in Metaprom
* is shared
* is watched
* inspires
* generates new users

The Preview is never treated as a downloadable file.

The Premium commercial:

* is purchased
* belongs to the customer
* is downloadable
* may be used without restrictions by the customer

Official principle:

> Preview belongs to Metaprom.
> Premium belongs to the customer.

##### Public Commercial Experience

Every Preview permanently lives at:

`https://metaprom.com/p/{share_slug}`

This page is NOT a landing page.

It is the permanent home of every commercial.

The commercial is the hero.

The page frames it.

Future visitors should emotionally experience:

"Wow..."

↓

"This came from one photo?"

↓

"I want one."

↓

Create yours free.

##### Product Vision

See **Project Vision** and **Long-Term Positioning** for the canonical product vision.

Metaprom's long-term direction includes becoming the place where commercial videos live — a platform for commercial creation led by a world-class Creative Director, not simply an AI generator.

This is NOT part of the MVP.

It remains a long-term vision only.

##### Product Stabilization

RC1.3.5 revealed an important change.

The platform is no longer bottlenecked by AI.

The bottleneck has become:

Product Stability.

Several regressions were discovered through real product usage.

Examples:

* broken navigation
* dead buttons
* incomplete flows
* state loss
* checkout regressions
* library navigation
* menu navigation

Official priority:

Stabilize before expanding.

##### Smoke Test Philosophy

Every PR must now finish with a complete Smoke Test.

Compilation is no longer sufficient.

Every user flow must be verified manually.

Required checklist:

PASS / FAIL

* Landing
* Studio
* Preview
* Checkout
* Premium
* Biblioteca
* Avatar Menu
* Public Commercial
* Navigation

Implemented is no longer enough.

Verified becomes the new development standard.

##### Navigation Philosophy

The browser Back button should never become the primary navigation mechanism.

Every screen should naturally guide the user.

No dead ends.

No dead buttons.

No dead links.

Navigation is now considered part of the product.

##### Error Experience

A critical UX discovery occurred.

Provider failures are acceptable.

Poor communication is not.

The platform should always preserve:

* uploaded image
* prompt
* workflow

Whenever recovery is possible.

Future direction:

Retry.

Not Restart.

The user should understand:

* what happened
* why it happened
* what they can do next

Never respond with generic:

"Something went wrong."

##### Error Taxonomy

Future error handling should distinguish:

* Safety / RAI
* Quota
* Timeout
* Storage
* Persistence
* Network
* Internal Error

Each category should have dedicated UX.

##### Product QA Discovery

An important development bottleneck was discovered.

Current development requires:

```
Upload
  ↓
Enhancement
  ↓
Preview
  ↓
Checkout
  ↓
Premium
  ↓
Biblioteca
```

just to verify small UI changes.

This wastes:

* time
* AI credits
* Vertex cost
* developer productivity

Future priority:

Developer QA Mode.

##### Developer QA Mode

Future architecture should allow developers to reuse existing Biblioteca assets.

Objective:

Jump directly into:

* Preview
* Checkout
* Biblioteca
* Public Commercial

using already-generated commercial assets.

No new AI generation should be required for routine UI testing.

Pipeline validation will continue using real AI generations.

UI validation should reuse existing assets.

##### Development Philosophy

A new engineering rule has been adopted.

Before:

```
Build
  ↓
Merge
```

Now:

```
Build
  ↓
Smoke Test
  ↓
UX Review
  ↓
Merge
```

Product quality now depends more on stability than feature count.

##### Current Priority

Finish Product Stabilization.

Do not continue expanding the Growth Engine until the following user flows are fully stable:

* Landing
* Studio
* Preview
* Checkout
* Premium
* Biblioteca
* Public Commercial
* Navigation

Only then continue with:

* PR3 completion
* Analytics
* Developer QA Mode
* Future Growth Engine phases

##### CEO Product Note

This chat marked an important transition.

Metaprom is no longer primarily solving AI problems.

Metaprom is now solving product problems.

That transition marks the beginning of a new stage.

The objective is no longer:

> Can we generate commercial videos?

The objective is now:

> Can every interaction feel effortless?

That is the new definition of product quality for Metaprom.

---

## MASTER UPDATE — RC1.3.5 Product Review (CEO Review) (July 2026)

*Historical — superseded by **MASTER UPDATE — RC1.4 — Stripe & Soft Launch (July 2026)** for current RC1 status and active objective. Preview vs Premium **duration and live teaser characteristics** below remain historical/LIVE documentation (~3–5 second teaser). Future Preview architecture, 4-second Veo source / ~1–1.5s customer-facing target (**not live**), and Preview/Premium as a **LAUNCH PRODUCT GATE** are governed by **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Supersedes **MASTER UPDATE — RC1 Customer Journey Progress (July 2026)** for RC1.3.5 product review context, project stage, product philosophy, Preview vs Premium differentiation, Preview Policy, Growth Engine, Public Landing, Demo Library, waiting experience, video architecture, official workflows, Growth Analytics vision, UX principles, prompt enrichment architecture, checkout scope, end-of-journey experience, Biblioteca capabilities, and acquisition strategy.*

### Project stage

Metaprom is no longer in the phase of building the engine.

The core infrastructure is **validated**.

The official priority has shifted from:

> Making Metaprom work

to:

> Making people want to use it, share it, and come back.

Starting RC1.3.5, the focus is **Product Experience** and **Growth Engine**.

RC1 is **feature complete** from an architectural perspective.

The commercial purchase journey has been successfully validated using the Mock Provider.

Creation flow:

```
Landing
  ↓
Studio
  ↓
Preview
  ↓
Unlock Commercial
  ↓
Checkout
  ↓
Mock Payment
  ↓
Premium Generation
  ↓
Download
  ↓
Biblioteca
```

No structural rewrites are required before Stripe integration.

### New product philosophy

Metaprom is **NOT** selling AI.

Metaprom is **NOT** selling prompts.

Metaprom sells **Creative Direction** and complete commercial experiences — not AI, not prompts. Every commercial must feel agency-directed. See **Product Philosophy** and **Creative Director** for official principles and jurisdiction.

Official slogan remains:

> Escribe lo que imaginas. Metaprom entiende el resto.

This slogan is an **architectural principle**. See **Creative Director**.

### Preview vs Premium

One of the most important discoveries during the CEO Product Review.

The Preview exists only to **create desire**.

The Premium exists to **deliver the complete commercial**.

This difference must always be obvious.

The Premium must never feel like a slightly longer Preview.

**Product rule:**

> The Premium commercial must always feel significantly more valuable than the Preview.

**August 19, 2026:** this rule remains in force and is now a **LAUNCH PRODUCT GATE**. The LIVE product does **not** yet create a sufficiently clear Preview vs Premium gap. Preferred future architecture (Storyboard → short AI Video Preview as proof/WOW → Premium as the finished product) is **APPROVED PRODUCT DIRECTION**, not live. See **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)** and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§4, 7, 12.

#### Preview

Purpose:

Generate the WOW factor and **acquire new users**.

Characteristics:

* approximately 3–5 seconds *(LIVE / historical documented characteristic; future customer-facing AI Video Preview target is approximately 1–1.5 seconds, **not live** — see **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**)*
* immediate impact
* teaser
* shareable
* never downloadable
* lives exclusively inside Metaprom
* always available in Biblioteca
* permanent public URL
* unlimited sharing

The Preview is **NOT** the product.

The Preview is a **permanent growth asset**.

Its objective is **not** to deliver a complete commercial. Public sharing still exists to **attract new users**. In-Studio, the future AI Video Preview's additional job is to prove that **this customer's asset** became a living production and to create desire for Premium — without giving the complete commercial away. That in-Studio purpose is **APPROVED PRODUCT DIRECTION**, not a live behavior change.

Every Preview must generate new users.

#### Premium

Purpose:

Deliver the complete commercial.

Target characteristics:

* maximum officially supported Veo clip duration
* preserves customer's selected aspect ratio
* complete commercial narrative
* cinematic sequence
* HD
* commercial-ready
* downloadable
* Creative Director available after generation

Target duration is an **internal objective**.

Customers should never purchase "seconds".

Customers purchase:

> A complete commercial.

Video Extension and clip chaining remain backlog only.

### Automatic prompt enrichment

Critical product decision — see **Creative Director** for current jurisdiction and principles.

Customer ideas must **never** be sent directly to the generation model.

```
Customer Idea + Commercial Copy (immutable)
  ↓
Metaprom Creative Director
  ↓
Expanded Cinematic Prompt (internal)
  ↓
Generation Model
```

The Creative Director layer is one of Metaprom's primary competitive advantages.

The Director enriches prompts with cinematic direction, pacing, camera movement, storytelling, and commercial structure — without rewriting customer commercial copy.

The customer writes the idea and supplies commercial copy. Metaprom creates the commercial.

### Product waiting experience

Waiting must **not** feel like a loader.

Waiting must feel like an **experience**.

The first wait **teaches** the product.

The second wait **inspires**.

Metaprom uses a library of short, memorable commercials during generation.

Current waiting times:

* Initial generation: approximately 2 minutes
* Premium generation: approximately 2–3 minutes

Static waiting screens are not acceptable.

Waiting experience requirements:

* premium fullscreen experience
* cinematic background video from the commercial library
* dynamic progress messaging
* premium loading animations
* clear explanation of current processing stage

Customers should always feel the product is actively working — never that they are waiting on a spinner.

### Checkout philosophy

The Mock Provider successfully validated the architecture.

Stripe will replace the payment provider later.

The Checkout architecture does **NOT** require redesign.

Only provider replacement.

### End-of-journey experience

Current implementation works technically.

However, the emotional conclusion is weak.

Future success screen:

> 🎬 Your Premium Commercial is Ready.

Primary CTA:

Download HD

Secondary CTA:

View in Biblioteca

Third CTA:

Create Another Commercial

Customers should always leave with a feeling of completion.

### Biblioteca philosophy

Preview assets and Premium assets are different products.

Preview capabilities:

* View — always available in Biblioteca
* Share — unlimited, with permanent public URL
* Never downloadable

Premium capabilities:

* View
* Download
* Share

### Growth Engine

The Preview is no longer a file.

The Preview is a **permanent acquisition channel**.

Official acquisition flow:

```
User
  ↓
Generates Preview
  ↓
Biblioteca
  ↓
Share
  ↓
Public Landing
  ↓
Watches the commercial
  ↓
Create yours free
  ↓
New user
```

Every Preview is a customer acquisition asset — not merely a free sample.

### Public Landing

The public landing does **NOT** explain AI.

It sells through **demonstration**.

Visual order:

1. Video
2. Created with Metaprom
3. Create yours free
4. *(Future)* Original photo → Preview

First, create emotion.

Then, explain.

See **Public Landing Philosophy**.

### Demo Library

The Demo Library does **NOT** exist to show pretty videos.

It exists to demonstrate that **anyone** can transform everyday content into premium campaigns.

Official rule:

**Always show the origin. Never repeat the exact same origin.**

Valid origin examples:

* Phone photo
* Downloaded image
* Local folder
* Drag & Drop
* Marketplace

What matters is proving:

> You can do this.

See **Demo Library**.

### Video architecture

All commercial generation must pass exclusively through:

```
Workflow
  ↓
generateCommercialVideo()
  ↓
Vertex Provider
  ↓
Model resolved by Workflow
  ↓
FFmpeg
  ↓
Video
```

Direct calls to Vertex for commercial generation are **prohibited**.

See **Video Architecture** and **Official Video Workflows**.

### Official Video Workflows

The UI never knows the model.

The UI knows only the **Workflow**.

| Workflow | Model |
|----------|-------|
| Preview | Veo Lite |
| Premium | Veo Fast |
| Enterprise | Enterprise model |

Model selection is resolved internally by the Workflow layer.

### Growth Analytics

Future product vision — metrics that matter for the Growth Engine:

* Views
* Unique Views
* Shares
* WhatsApp Shares
* Copy Link
* CTA Clicks
* Registrations
* Conversions
* Watch Completion %

See **Growth Analytics (Future Vision)**.

### UX Principles

Permanent product principles:

* **Do not explain. Demonstrate.**
* **The user must never feel they are using AI.**
* **The Preview does not sell a complete commercial.** Public sharing still **sells the next user**. In-Studio, future AI Video Preview = **PROOF + WOW** (not a mini-commercial). Premium = the finished product. Preview/Premium differentiation is a **LAUNCH PRODUCT GATE**. See **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)** and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§7, 12, 16.
* **You take the photo. Metaprom does the rest.**

See **Product Philosophy**.

### Internal product principle

Every commercial must sell **TWO** things.

1. The customer's product.
2. Metaprom.

If someone watches a Preview and asks:

> How did you make this?

Metaprom has achieved its purpose.

### RC1.3.5 focus

The current focus is **Product Experience** and **Growth Engine**.

Do **NOT**:

* redesign architecture
* modify AI infrastructure
* modify payment providers
* implement features unrelated to experience or acquisition

Improve:

* waiting experience
* Premium differentiation
* Preview as growth asset
* Public Landing demonstration
* Demo Library origin storytelling
* final success experience
* customer emotional journey

Once RC1.3.5 is complete:

Proceed to:

> **RC1.4 — Stripe Integration** *(active — see **MASTER UPDATE — RC1.4 — Stripe & Soft Launch (July 2026)**)*

---

## MASTER UPDATE — RC1 Customer Journey Progress (July 2026)

*Historical — superseded by **MASTER UPDATE — RC1.3.5 Product Review (CEO Review) (July 2026)** for current RC1 status, project stage, product philosophy, Preview Policy, Growth Engine, Public Landing, Demo Library, waiting experience, video architecture, official workflows, Growth Analytics vision, UX principles, prompt enrichment, checkout scope, end-of-journey experience, Biblioteca capabilities, and acquisition strategy.*

*Supersedes **MASTER UPDATE — July 10, 2026** for current RC1 status, AI engine stability, checkout priority, schema drift findings, and product positioning. All prior sections remain as historical record and previously validated decisions remain valid unless explicitly updated here.*

### Executive summary

RC1 reached an important milestone: the AI generation engine is now considered **production-stable**.

The remaining work is no longer AI infrastructure. The remaining work is completion of the **commercial customer journey**.

Completed:

* Image generation
* Video generation
* Persistence pipeline restored
* Biblioteca restored
* Purchases infrastructure restored
* Mock payment provider operational
* Premium video generation operational

The product is now capable of:

```
Photo
  ↓
AI Image
  ↓
AI Video
  ↓
Persist
  ↓
Library
  ↓
Premium HD generation
```

### Root cause discovered

A significant **Schema Drift** was discovered between the repository and the live Supabase database.

Examples found:

* Missing `public.purchases` table
* Missing `projects.destination` column
* Historical schema mismatches
* Partial migration history

The issue was infrastructure consistency, not application architecture.

A recovery migration restored the missing purchases infrastructure.

### Post-launch technical debt

Create a dedicated **Schema Alignment Sprint**.

Objective:

> Repository schema == Live production schema

Establish database governance:

* No manual production schema changes.
* Every schema change originates from a migration.
* Repository becomes the single source of truth.
* Schema Drift Audit before every production release.

### CEO product review

The product philosophy has been validated.

The emotional value of Metaprom is **not** photo enhancement.

The emotional value is:

> A normal photo becomes a cinematic commercial.

That remains the core product positioning.

Photo enhancement becomes a secondary capability.

### Official product slogan

Official slogan:

> Escribe lo que imaginas. Metaprom entiende el resto.

### Current RC1 status

*HISTORICAL RC1 customer-journey status. Current objective: GO-TO-MARKET. See **NEXT SESSION START HERE**.*

The remaining blocker is no longer technical infrastructure.

The remaining work is **Customer Journey completion**.

Current flow:

```
Generate
  ↓
Preview
  ↓
Premium generation
```

Desired flow:

```
Generate
  ↓
Preview
  ↓
Unlock Commercial
  ↓
Checkout
  ↓
Payment
  ↓
Premium HD
  ↓
Download
```

The customer must clearly understand:

> I am now purchasing my commercial.

### Next sprint

**RC1.3 — Checkout Experience**

Objective:

> Complete the commercial purchase journey.

Build:

* Checkout screen
* Purchase summary
* Price presentation
* Payment step
* Payment confirmation
* Premium unlock
* HD download

First with Mock Provider.

Only after the journey is fully validated:

> Enable Stripe Test.

### UX notes

Add a proactive warning about protected brands before generation.

Explain that well-known trademarks, including Nike, Coca-Cola, and McDonald's, may prevent generation because of AI provider restrictions.

Preventing failed generations provides a much better user experience.

Biblioteca now works.

Future improvement:

> Allow users to reopen, purchase, and download commercial assets directly from Biblioteca.

### Strategic status

The engine is finished.

The remaining work is product experience.

Metaprom has officially entered **Release Candidate** phase.

---

## MASTER UPDATE — July 10, 2026

*Historical — superseded for later RC1 status by subsequent July updates, and for current operating truth by **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

*Supersedes **MASTER UPDATE — July 1, 2026** for current project status, Sprint state, revenue priority, Hero final state, and launch strategy. All prior sections remain as historical record and previously validated decisions remain valid unless explicitly updated here.*

### Current project status

**Sprint 3.2 is officially closed.**

Metaprom has completed Product Polish for the current Beta baseline and is entering **Sprint 4 — Revenue Sprint**.

Current objective:

> Generate revenue.

Previous objective:

> Finish the product.

Success is no longer measured by completed features alone. Success is measured by customers obtaining value and paying happily.

### Sprint 3.2 closure

Sprint 3.2 closed with the following decisions and outcomes:

* Hero V2 approved for production.
* Hero enters the **Art Direction** phase.
* Runtime architecture considered stable.
* Rendering investigation completed.
* Git repository reorganized and cleaned.
* Hero branch pushed successfully.
* Sprint 3.2 officially closed.

### Hero final state

Hero layout, phone mockup, phone alignment, HTML video alignment, and Hero composition are **approved and locked**. See **Hero** for current specification.

Engineering lesson:

> Always identify the parameter before describing the behavior.

See **Hero V2 Rendering Investigation — Complete (July 8, 2026)**.

### Git cleanup methodology

Git cleanup is now a documented engineering discipline.

Important principles:

* Never mix cleanup with production commits.
* Production commits first.
* Cleanup last.
* Every commit should remain buildable.
* Repository cleanup is operational work, not product work.

Current repository state:

* Repository is clean.
* Hero branch is synchronized with remote.

### Product philosophy update

Metaprom does **NOT** sell AI.

Metaprom sells **Creative Direction**.

See **Product Philosophy** and **Creative Director** for official principles.

### Revenue strategy

Revenue becomes the company's primary objective.

Previous objective:

> Finish the product.

Current objective:

> Generate revenue.

The **Revenue Sprint** begins after Sprint 3.2.

Stripe is selected as the payment platform after commercial evaluation and after considering previous experience with chargebacks and payment providers.

Reasons for Stripe:

* Fraud prevention.
* Radar.
* Smart Disputes.
* 3D Secure.
* Strong support for digital businesses.
* Mexican payment methods.
* OXXO.
* SPEI.
* Excellent documentation.
* Professional commercial support.

### Payment philosophy

Never ask for payment before the WOW moment.

Official payment sequence:

```
User uploads photo
↓
Commercial generated
↓
User experiences WOW
↓
User wants to own the commercial
↓
Payment
↓
HD download
```

The product demonstrates value before requesting money.

### Growth engine

Marketing is no longer considered traditional advertising.

Growth is based on **demonstration** and **curiosity**.

Official acquisition flow:

```
User
  ↓
Generates Preview
  ↓
Biblioteca
  ↓
Share
  ↓
Public Landing
  ↓
Watches the commercial
  ↓
Create yours free
  ↓
New user
```

The Preview is a permanent acquisition channel — not a downloadable file. That **LIVE** public-share job remains. Future in-Studio AI Video Preview also has a capability-proof / WOW job that must not give away the complete Premium. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§7, 16.

Sharing is a consequence of pride, not an obligation.

The goal is to make customers naturally want to show their commercial.

Every Preview must generate new users.

See **Growth Engine**, **Preview Policy**, and **Growth Analytics (Future Vision)**.

### Marketing philosophy

Never market AI.

Never educate users about AI.

Never require users to understand prompts.

Never compete on models.

Compete on:

* results
* premium perception
* simplicity

### Launch strategy

Do **NOT** position Metaprom as:

* startup
* beta
* experimental
* early company

Position Metaprom as:

> A premium commercial platform that has dramatically reduced production costs through AI.

Price should communicate **opportunity**, not immaturity.

### Next milestone

**Sprint 4 — Revenue Sprint**

Primary milestone:

> The first happy paying customer.

Success is measured by customers obtaining value and paying happily.

---

## MASTER UPDATE — July 1, 2026

*Historical — superseded by **MASTER UPDATE — July 10, 2026** for current status, Sprint state, revenue priority, Hero final state, and launch strategy. Supersedes **Executive Summary (June 29, 2026)** and **MASTER UPDATE — June 29, 2026** for its original product direction. All prior sections remain as historical record.*

### Current project status

Metaprom has **completed the AI engine**.

The project has officially entered the **Product Polish** phase.

Current work focuses on **UX, commercialization, and Beta readiness**.

### Canonical product — Studio

**Studio is now the only production experience.**

```
Landing → Studio
```

* **Experience onboarding has been deprecated.** Route `/experience` is no longer the canonical journey (see **Metaprom Experience v1** for historical context).
* **Biblioteca is centralized in Studio.**
* **Studio is the canonical user journey.**

### Core product discovery

The biggest discovery of this phase:

> Customers should **NOT** spend time producing a better photo.
> Customers should spend time **describing the commercial they want**.

Metaprom takes care of:

* photography cleanup
* enhancement
* lighting
* composition
* commercial creation

**New philosophy:**

> Take any photo.
> Describe the commercial.
> Metaprom creates the production.

This became the **core positioning** of the product.

See **Product Philosophy**, **Biblioteca — Commercial Portfolio (July 1, 2026)**, and **Long-Term Positioning**.

### Biblioteca — Commercial Portfolio

Biblioteca is **no longer considered a file browser**.

It is a **Commercial Portfolio**.

Each project should visually tell one story:

```
Original Photo
↓
Premium Image
↓
Free Teaser
↓
HD Commercial
```

The **transformation itself is the product.**

Future UX decisions should reinforce this concept.

See **Biblioteca — Commercial Portfolio (July 1, 2026)**.

### Customer experience — provider invisibility

Provider implementation details must **never** reach customers.

**Never expose:**

* Vertex
* provider names
* safety filters
* technical messages
* provider error codes

Failures must always be translated into **premium Metaprom messaging**.

See **Customer Experience (July 1, 2026)**.

### Hero — approved artwork

Hero layout, phone mockup, phone alignment, HTML video alignment, and Hero composition are **approved and locked**. See **Hero**.

### Beta status — Sprint 3.2

**Historical phase:** Sprint 3.2 — **Final Beta Polish**

Final scope before Revenue Sprint:

* Biblioteca refresh reliability
* Biblioteca navigation polish
* Hero art direction
* Premium rejection messaging

### Next phase — Sprint 4

**Sprint 4 — Revenue Sprint**

Primary milestone: **the first happy paying customer**.

See **Product Completion Roadmap (June 2026)** and **Beta Strategy**.

### Long-term positioning

See **Long-Term Positioning** and **Project Vision** for canonical positioning and final product vision.

### Current roadmap (July 1, 2026 — historical)

| Phase | Status |
|-------|--------|
| AI Engine | **Complete** |
| Shared Architecture | **Complete** |
| Reliability Sprint | **Complete** |
| Product Experience | **Complete** |
| **Product Polish (Sprint 3.2)** | **Closed July 10, 2026** |
| Sprint 4 — Revenue Sprint | **Active** |
| Public Beta | Pending — after Payments |

**Rule:** No new AI features unless they directly improve the commercial journey.

**Historical note:** Prior roadmap items (CEO Product Review, `/experience` canonical flow, Instant Capture) are preserved in **MASTER UPDATE — June 29, 2026** and below. Current status is defined by **MASTER UPDATE — July 10, 2026**.

---

## MASTER UPDATE — June 29, 2026

*Historical — preserved. Canonical product flow and priorities superseded by **MASTER UPDATE — July 1, 2026**.*

### Product phase transition

Metaprom has officially transitioned from **AI Development** to **Product Experience**.

The AI engine is considered mature enough for MVP completion. Future work prioritizes customer journey, conversion, and product experience over new AI capabilities.

### Canonical product flow — `/experience`

Route **`/experience`** is now the **canonical commercial journey**.

It is **no longer a simulation**. It orchestrates the same production services used by Studio:

* `/api/enhancement`, `/api/video`, checkout, library persistence
* Shared logic in `lib/studio-creation.ts` — no duplicated AI pipelines, checkout, or persistence

See **Commercial Product Journey** and `docs/experience-v1.md`.

### Reliability Sprint — complete

Root cause of intermittent image failures identified: OpenAI occasionally returned `status: completed` with text-only output instead of invoking `image_generation`.

**Shipped:**

* Forced `image_generation` tool selection (`tool_choice`)
* Prompt hardening
* Response validation
* Bounded retry strategy (up to 3 attempts)
* Structured logging (`lib/enhancement.ts`)

**Measured result:** 20/20 successful image generations during reliability testing. **Reliability Sprint considered complete.**

### Infrastructure findings

Google AI Studio billing investigated:

| Item | Value |
|------|-------|
| Prepaid credit remaining | ~MXN 427 |
| Current monthly usage | ~MXN 72 |
| Billing issue | **None** |

`429 RESOURCE_EXHAUSTED` was caused by **Veo quota exhaustion**, not cost or billing sync.

| Item | Value |
|------|-------|
| Current model | `veo-3.1-lite-generate-preview` |
| Current Veo 3 Lite quota | **10 video generations / day** (Tier 1, per project) |
| Production scaling | Research initiated — see **Veo Capacity Planning (June 29, 2026)** |

### Product discovery — Instant Capture

Working name: **Instant Capture**

Instead of requiring users to upload an existing image, Metaprom should allow:

```
📸 Take Photo → Generate Commercial
```

This removes preparation friction and enables instant product demonstrations.

**Priority:** High — candidate for implementation immediately before Beta, after CEO Review and UX Polish.

### Current roadmap

| Phase | Status |
|-------|--------|
| AI Engine | **Complete** |
| Shared Architecture | **Complete** |
| Reliability Sprint | **Complete** |
| CEO Product Review | **Next** |
| UX Polish | Pending |
| Instant Capture | Pending (pre-Beta) |
| Beta | Pending |

**Rule:** No new AI features unless they directly improve the commercial journey.

---

## Metaprom Experience v1 (June 28, 2026 — updated June 29, 2026)

*Historical — preserved. Experience onboarding deprecated July 1, 2026. **Studio** is now the canonical production experience. See **MASTER UPDATE — July 1, 2026**.*

**Product decision:** Do not build isolated screen mockups anymore.

Build **one interactive product surface** — **Metaprom Experience v1** at `/experience` — that defines the complete customer journey. Landing and Studio are visually one product: dark, minimal, elegant, cinematic.

**June 29 update:** `/experience` is the **canonical commercial journey**, wired to production APIs via shared services — not a simulation.

This remains the **master specification** for the commercial MVP. Future implementations must follow it, not individual static mockups.

See `docs/experience-v1.md`.

---

## Executive Summary (June 29, 2026)

*Historical — preserved. Superseded by **Executive Summary (July 1, 2026)** and **MASTER UPDATE — July 1, 2026**.*

**Metaprom has officially transitioned from building an AI engine to building a world-class commercial product experience.**

The AI generation stack — commercial image transformation and cinematic video via Veo 3.1 Lite — is **mature enough for Beta**. First real customer WOW was validated on June 28, 2026. The product hypothesis is confirmed: customers buy the feeling of seeing their own product transformed into professional marketing, not AI.

**The primary bottleneck is no longer generation quality, image reliability, or engine construction.** It is Product Experience, Growth Engine, customer conversion, and **Veo daily quota capacity** for video at Beta scale.

| Era | Focus | Status |
|-----|-------|--------|
| Phase 1 — AI Engine | Image + video generation, prompts, APIs | **Complete** |
| Phase 1b — Reliability Sprint | Image generation reliability (OpenAI tool invocation) | **Complete (June 29, 2026)** |
| Phase 2 — Product Experience | Commercial MVP, Cinematic Reveal, checkout, library, Beta | **Active** |

**Strategic change:**

> Metaprom is no longer AI-first. Metaprom is **Product Experience First**.

The objective is no longer improving AI generation. The objective is creating a **premium commercial experience** that converts — from first visit through purchase and download.

**Current priorities (in order — June 29, 2026):**

1. **CEO Product Review** — walk `/experience` end-to-end
2. **UX Polish** — conversion and journey friction
3. **Instant Capture** — camera-first flow (pre-Beta)
4. **Beta launch** — after journey validated + Veo capacity plan in place
5. Complete commercial MVP (ongoing)
6. Automatic Library
7. Premium checkout (production provider)
8. Membership system

**Deferred:** New AI capabilities unless they directly improve the commercial journey.

**Success metric:**

> Customers say: *"WOW… I want this commercial."*

See **Product Completion Roadmap (June 2026)**, **Cinematic Reveal**, **Commercial Product Journey**, **Product Philosophy**, **Official Development Workflow**, and **Team Roles**.

*Superseded for current direction by **Executive Summary (July 1, 2026)** and **MASTER UPDATE — July 1, 2026**.*

---

## Executive Summary (July 1, 2026)

*Historical — superseded by **MASTER UPDATE — July 10, 2026** for later July status. Current operating truth: **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

**Metaprom has completed the AI engine and entered Product Polish — the final stretch before Payments and Public Beta.**

Studio is the **only production experience** (`Landing → Studio`). Experience onboarding (`/experience`) is deprecated. Biblioteca lives inside Studio as a **Commercial Portfolio**, not a file browser.

**Core positioning (July 2026):**

> Take any photo. Describe the commercial. Metaprom creates the production.

Customers should describe the commercial they want — not spend time producing a better photo. Metaprom handles cleanup, enhancement, lighting, composition, and commercial creation.

| Era | Focus | Status |
|-----|-------|--------|
| Phase 1 — AI Engine | Image + video generation, prompts, APIs | **Complete** |
| Phase 1b — Reliability Sprint | Image generation reliability | **Complete** |
| Phase 2 — Product Experience | Commercial MVP, Cinematic Reveal, checkout, library | **Complete** |
| Phase 3 — Product Polish | UX, commercialization, Beta readiness (Sprint 3.2) | **Closed July 10, 2026** |
| Phase 4 — Revenue Sprint | Stripe payment integration and first happy paying customer | **Active** |
| Phase 5 — Public Beta | After Payments | Pending |

**Sprint 3.2 final scope (closed July 10, 2026):**

1. Biblioteca refresh reliability
2. Biblioteca navigation polish
3. Hero art direction
4. Premium rejection messaging

**Strategic positioning:**

Metaprom is a **commercial creation platform** — not an AI company, not an image enhancement tool. The Creative Director is a primary competitive advantage.

> You focus on your business. Metaprom creates your commercial.

**Final vision:** See **Project Vision**.

**Customer experience rule:** Provider details (Vertex, safety filters, error codes) never reach customers. Failures translate to premium Metaprom messaging.

See **MASTER UPDATE — July 10, 2026**, **MASTER UPDATE — July 1, 2026**, **Biblioteca — Commercial Portfolio (July 1, 2026)**, **Hero**, **Customer Experience (July 1, 2026)**, and **Long-Term Positioning**.

---

## Project Vision

Metaprom is a commercial creation platform — an **advertising production factory** — focused on professional advertising assets for ecommerce sellers, restaurants, real estate, and SMBs — not merely improving product photos or selling AI tools.

**Final vision:**

Anyone, regardless of technical knowledge, should be able to create a premium commercial simply by collaborating with a world-class Creative Director.

The AI should become invisible. The customer should remember the Director. The Director should become the face of Metaprom.

Core philosophy:

> Customers do not want AI. Customers want content that helps them sell.

> Metaprom does not sell AI access. Metaprom sells finished advertising assets, produced through Creative / Production Direction.

Core mission:

> Bring premium advertising creation to people who are not AI experts.

Metaprom sells marketing results and creative direction, not AI. Customers should never need to understand AI models, prompts, tokens, APIs, Veo, or Gemini.

Growth philosophy:

> You take the photo. Metaprom does the rest.

Every Preview is a permanent acquisition channel. The product grows when customers share their commercials and new users arrive through public landing pages — not when they download files.

Platform scope:

* Commercial image generation
* Cinematic video generation
* Automatic marketing asset library
* Premium commercial purchase and download
* Creative Director — senior creative partnership throughout the commercial journey

See **Creative Director**, **Strategic Pivot – Metaprom AI Evolution (June 2026)**, **Milestone — First Real Commercial Generated (June 28, 2026)**, and **Video Generation — Validated (June 2026)**.

---

## Product Completion Roadmap (June 2026)

*Updated July 10, 2026 — see **MASTER UPDATE — July 10, 2026** for Sprint 3.2 closure and Sprint 4 Revenue Sprint status. **Current operating objective (August 18–19, 2026):** GO-TO-MARKET — see **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**. Earlier priorities below are preserved as historical context.*

### Strategic direction

**Metaprom is Product Experience First — powered by the Creative Director.**

The AI engine is mature. The primary focus is product experience, commercial quality, customer confidence, and Creative Director excellence.

Objective:

> Complete the commercial flow as one continuous premium experience — led by a world-class Creative Director.

Success metric:

> Customers say: *"WOW… I want this commercial."*

### Current priorities (official — June 29, 2026) — HISTORICAL

*HISTORICAL June 29, 2026 table. Current objective: GO-TO-MARKET. See **NEXT SESSION START HERE**.*

| # | Priority | Status |
|---|----------|--------|
| 1 | **CEO Product Review** | **Next** |
| 2 | **UX Polish** | Pending |
| 3 | **Instant Capture** | Discovery — pre-Beta |
| 4 | **Beta launch** | Pending — blocked on journey + Veo capacity |
| 5 | Complete commercial MVP | In progress — `/experience` canonical |
| 6 | Complete Studio workflow | Functional — shared services with Experience |
| 7 | Automatic Library | Sprint 1 shipped — UI polish pending |
| 8 | Premium checkout | Sprint 2 shipped — production provider TBD |
| 9 | Membership system | Not started — mockups required |

**Completed since June 28:** Reliability Sprint (image generation 20/20), `/experience` wired to production services, shared `lib/studio-creation.ts` architecture.

**The objective is no longer improving AI generation. The objective is creating a premium commercial experience.**

### Product principles (non-negotiable)

See **Product Philosophy** for official principles. Summary:

* The customer buys **results**, not AI.
* Never expose prompts, models, or technical concepts.
* **Product Experience First.** **The WOW stays inside Metaprom** (see **Cinematic Reveal**).
* Customer commercial copy is **immutable project input** (see **Creative Director**).
* Saving is automatic. Library is automatic. Checkout sells the **commercial**, not the payment.
* Important screens require **approved mockups before implementation** (see **Product Review Process**).

### Commercial tiers

*HISTORICAL June 2026 tier language. LIVE current teaser remains as shipped. Duration ~3–5 seconds is LIVE/historical documentation. Future customer-facing AI Video Preview target is approximately 1–1.5 seconds (**not live**; 4-second Veo source is a working technical finding). Whether the first preview is free remains **OPEN**. Preferred funnel and Preview Pro are **APPROVED PRODUCT DIRECTION**, not live. Current Commercial price is MXN $180, not $149. See **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**, **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**, and GTM §8.*

**Free (customer acquisition — Preview)**

* 3–5 second teaser video *(LIVE / historical documented characteristic)*
* Metaprom watermark
* Medium quality
* Delivered via **Cinematic Reveal** — creates trust and WOW, not the full deliverable
* Never downloadable — lives exclusively inside Metaprom
* Always available in Biblioteca with permanent public URL
* Unlimited sharing — each Preview is an acquisition channel

**Premium (paid)**

* Maximum officially supported Veo clip duration
* Preserves the customer's selected aspect ratio
* No watermark
* Marketing-ready download
* Unlocked after checkout inside Studio
* Creative Director available after Premium generation

Preview remains lightweight. Video Extension and clip chaining remain backlog only — not current product scope.

Reference price: **$149 MXN** (`commercial-video` in `lib/pricing.ts`).

### Payment architecture

Payment architecture must remain **provider-agnostic**. Never couple product architecture to a specific payment provider.

Generic abstraction: `lib/payments/`

| Method | Support |
|--------|---------|
| Cards | Interface + mock provider |
| OXXO (Mexico) | Interface + mock provider |
| Future providers | Mercado Pago, Stripe, etc. as plug-in implementations |

Environment: `PAYMENT_PROVIDER` (default `mock` for development).

See **Payments Architecture** and `lib/payments/README.md`.

### Session deliverables (June 28, 2026)

| Deliverable | Status |
|-------------|--------|
| Sprint 1 — auto-persistence (original, enhanced, video, prompts, metadata) | Shipped |
| Supabase Storage bucket + migration | Migration prepared |
| Sprint 2 — free teaser + premium + payment abstraction | Shipped |
| Checkout + Library mockups (`docs/mockups/`) | Ready for review |
| **Cinematic Reveal** — signature premiere experience | Shipped |
| METAPROM_MASTER strategic transition | This update |

---

## Cinematic Reveal (June 2026)

**Internal product name:** Cinematic Reveal

**Priority:** One of the highest UX priorities. **The signature experience of Metaprom.**

The emotional peak of the product must happen **before** the purchase decision — inside Metaprom, not after downloading the file.

### Problem (obsolete flow — do not return to this)

```
Generation → small embedded preview → download → user watches fullscreen outside app → WOW
```

The WOW moment happened **outside** the product. Incorrect.

### Signature flow (official)

```
Generation complete
  ↓
Fade to black
  ↓
Metaprom Infinity logo (~1 second)
  ↓
Automatic fullscreen playback
  ↓
Audio ON (by default)
  ↓
No controls during the opening seconds
  ↓
Premium Offer
  · CTA: "Desbloquea el comercial completo"
  ↓
Checkout
  ↓
Library (automatic)
  ↓
Download Center
```

The user should feel like watching a **movie premiere**.

### Objective

> The objective is NOT showing a generated video.
> The objective is creating an emotional WOW moment **inside** Metaprom.

### Tiers

| Tier | Spec | When |
|------|------|------|
| Free (teaser) | 3–5 s · watermark · medium quality | Cinematic Reveal playback |
| Premium | 10–15 s · HD · no watermark | After checkout |

### Implementation (shipped June 28, 2026)

| Item | Location |
|------|----------|
| Premiere component | `components/studio/CinematicReveal.tsx` |
| Infinity logo | `components/studio/MetapromInfinityLogo.tsx` |
| Studio phases | `cinematic-reveal` → `premium-offer` → `purchase-hd` |
| Video post-processing | `lib/video-processing.ts` (trim, watermark, tier) |
| Brief | `docs/mockups/cinematic-reveal-brief.md` |

**Rule:** Every future video experience must preserve this philosophy.

---

## UX Discoveries (June 28–29, 2026)

Insights from first real customer WOW and the Product Experience transition:

* The user remembers **emotional peaks** more than technical quality.
* The WOW moment must happen **inside Metaprom** — not after download (see **Cinematic Reveal**).
* Landing and Studio must become **visually continuous** — one premium surface, not two products.
* Every transition must feel **cinematic** — fade, premiere, reveal; not page reloads or small embeds.
* **Library is automatic** — the customer never manages files.
* **Saving is automatic** — the customer never loses work.
* **Checkout sells the commercial**, not the payment — copy and UI lead with the result, not the transaction.

### Instant Capture (June 29, 2026 — high priority)

**Working name:** Instant Capture

Instead of upload-only, allow **Take Photo → Generate Commercial** in one flow. Removes preparation friction; enables live demos and impulse creation.

Candidate for implementation **after CEO Review and UX Polish**, immediately before Beta.

These discoveries supersede earlier priorities focused on multi-industry AI consistency testing as the primary sprint goal. Customer tests remain mandatory, but only **after the commercial loop is exercisable**.

---

## Commercial Product Journey (June 2026)

The complete commercial journey — the product should feel like **one continuous premium experience**:

```
Landing
  ↓
Upload
  ↓
Intent
  ↓
Generate
  ↓
Google Login (only when the project needs to be saved)
  ↓
Generating
  ↓
Cinematic Reveal
  ↓
Premium Offer
  ↓
Checkout
  ↓
Library
  ↓
Download Center
  ↓
Create Another Commercial
```

**Master specification:** [Metaprom Experience v1](./docs/experience-v1.md) at **`/experience`** (canonical production journey).

Landing + Studio unification is **shipped** — `/experience` orchestrates production APIs; Studio uses the same shared services (`lib/studio-creation.ts`).

---

## Official Development Workflow (June 2026)

The official Metaprom product development workflow:

```
Idea
  ↓
Strategic discussion
  ↓
Metaprom Experience v1 (interactive prototype)
  ↓
CEO approval
  ↓
Cursor implementation (match prototype)
  ↓
UX Review
  ↓
Iteration
```

**Permanent rule:** No major UI may be implemented before the Experience v1 prototype (or its approved iteration) defines the journey.

Isolated static mockups are deprecated for journey design — see **Metaprom Experience v1**.

### Product Review Process

Every important screen requires:

1. **Mockup** — brief + visual in `docs/mockups/`
2. **Product review** — UX and copy validated
3. **Approval** — CEO sign-off documented in brief
4. **Implementation** — Cursor builds to match approved mockup only

### Applies to (mockup required)

* Library (full redesign)
* Checkout UI polish
* Membership dashboard
* Download center
* Landing + Studio unified experience — **Experience v1 prototype** at `/experience`

### Does not block

* Backend persistence, storage, APIs
* Payment abstraction and routes
* Cinematic Reveal (product principle — shipped)
* Minimal functional wiring to existing Studio surfaces

### Mockup assets (June 28, 2026)

| Screen | Preview |
|--------|---------|
| Checkout (5 states) | `docs/mockups/previews/checkout.html` |
| Library (4 states) | `docs/mockups/previews/library.html` |
| Design tokens | `docs/mockups/design-tokens.md` |
| PNG exports | `docs/mockups/approvals/` |

Status: **Ready for product review** — not yet approved for full UI implementation.

See `docs/mockups/README.md`.

### Product Review Backlog

| Priority | Item | Notes |
|----------|------|-------|
| **P1 UX** | Hide internal generation prompts during creating/generating | Customer must never see AI prompt text above the upload/generating area. Replace with customer-facing copy (e.g. "Preparing your commercial..." / "Our creative director is producing your video..."). Aligns with Product Philosophy — never expose prompts. |

---

## Team Roles (June 2026)

| Role | Person / Tool | Responsibility |
|------|---------------|----------------|
| **CEO** | Roberto | Vision, business, product strategy, final approval |
| **Product Design** | ChatGPT | UX, product architecture, mockups, commercial experience |
| **CTO / Engineering** | Cursor | Implementation, refactoring, technical architecture |

### Roberto — CEO

* Vision
* Business
* Product strategy
* Mockup and feature approval

### ChatGPT — Product Design

* Product design
* UX
* Product architecture
* Mockups as implementation specifications
* Commercial experience design

### Cursor — CTO / Engineering

* Engineering
* Implementation
* Refactoring
* Technical architecture
* Repository intelligence

See **AI Development Workflow** for multi-tool execution details.

---

## Payments Architecture (June 2026)

Payment architecture must remain **provider-agnostic**. Never couple product architecture to Mercado Pago, Stripe, or any single provider.

### Requirements

* Support multiple payment methods: **cards**, **OXXO**, and future providers
* Plug-in provider implementations behind a common interface
* Product code references `lib/payments/` — not provider SDKs directly in UI

### Implementation (shipped)

| Item | Location |
|------|----------|
| Provider interface | `lib/payments/types.ts` |
| Provider registry | `lib/payments/index.ts` |
| Mock provider (dev) | `lib/payments/providers/mock.ts` |
| Checkout API | `POST/GET /api/payments/checkout` |
| Webhook API | `POST /api/payments/webhook` |
| Purchases table | `supabase/migrations/20260628120000_library_storage_and_commercial.sql` |

Environment: `PAYMENT_PROVIDER=mock` (development). Production provider TBD after Beta validation.

*HISTORICAL June 2026 note. Stripe is the selected production payment platform. Stripe Live is operational as of August 18, 2026. See GTM §§14–16.*

---

## Continuity Context (June 2026)

*Handoff summary — consolidates then-current state, recent discoveries, and immediate next objective.*

*HISTORICAL June/July 2026 handoff. Current operating truth: **Current State**, **NEXT SESSION START HERE**, and **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

### Project State

| Item | Value |
|------|-------|
| Project | Metaprom AI |
| Domain | metaprom.com |
| Stack | Next.js + TypeScript + Supabase + Vercel |
| **Strategic mode** | **Product Experience First** — Beta preparation |
| AI engine | **Mature enough for Beta** — image + Veo 3.1 Lite video validated |
| Primary bottleneck | UX, commercial flow, customer conversion |
| Studio | **Studio IS the product** — `/studio` |
| Signature UX | **Cinematic Reveal** — shipped June 28, 2026 |
| Video | Google Gemini API — Veo 3.1 Lite (`veo-3.1-lite-generate-preview`) |
| First customer WOW | **Validated (June 28, 2026)** |
| Commercial MVP | Sprint 1 + 2 shipped — migration + mockup approval pending |

### Recent Discoveries

#### First Real Commercial — Customer WOW Validated (June 28, 2026)

For the first time, Metaprom transformed a simple cellphone product photo into a commercial scene and generated a cinematic promotional video that produced a genuine **WOW** reaction in a real customer test.

This validates the core product hypothesis:

> Customers are not buying AI. Customers are buying the feeling of seeing their own product transformed into professional marketing.

The biggest lesson was **experiential**, not technical. Metaprom is a commercial creation platform with a world-class Creative Director — not an image enhancement platform or AI tool. The customer should feel they are working with a senior creative director at an agency, not operating software.

See **Milestone — First Real Commercial Generated (June 28, 2026)**.

#### UX (Kling analysis)

Kling generates spectacular WOW but the experience becomes an aircraft cockpit — users get lost in menus, credits, and settings.

Adopted principle:

> "The user should not navigate Metaprom AI. Metaprom AI should navigate the user."

Target experience: **Uber-like** — no models, parameters, credits, or technical complexity exposed.

Guided path: Photo → Result → Purchase → Subscription.

See **UX Philosophy — Kling Analysis Breakthrough (June 2026)**.

#### Commercial Strategy

Primary target market is **not AI experts**. Target:

* Business owners, restaurants, real estate
* Amazon and Mercado Libre sellers
* SMBs (pymes)

Conclusion:

Experts buy technology. Businesses buy results.

#### Video AI

**Status: VALIDATED (June 2026).** See **Video Generation — Validated (June 2026)** and **Economic Validation — Veo 3.1 Lite (June 2026)**.

Integration completed: Image → Prompt → Veo 3.1 Lite → MP4 → Browser. Multiple real generations successful.

Earlier research (provider comparison, preliminary pricing) remains in **Video Strategy Discovery (June 2026)** — some items superseded by measured economics.

#### Conversion Philosophy

No complex dashboards. No menu exploration after demo.

After free video demo:

> "Your video is ready." → "Download HD without watermark." → "$170 MXN" → **[ Buy Now ]**

See **UX Philosophy — Kling Analysis Breakthrough (June 2026)** — Critical Sales Insight.

#### Zoho Email Migration

Completed successfully (June 2026).

Issues resolved:

* Incorrect SPF inherited from GoDaddy
* Residual Outlook MX records
* Email reception restored
* Alias roberto@metaprom.com operational

Lesson: do not confuse a completed internal process with value delivered to the end user.

See **Infrastructure & Operations**.

### Immediate Next Objective

*HISTORICAL June 2026 execution order. Current execution order: **NEXT SESSION START HERE**.*

**Then:** Complete the commercial MVP and prepare for Beta — not more AI experimentation.

Active execution order:

1. Apply Supabase migrations (Storage, purchases, RLS)
2. Approve Checkout + Library mockups → implement redesigned UI
3. Membership system (mockup → approval → build)
4. Landing + Studio unified experience (mockup → approval → build)
5. End-to-end customer test of full journey → Beta launch

Every sprint ends with a real customer test when the commercial loop is exercisable.

See **Product Completion Roadmap (June 2026)**, **Cinematic Reveal**, and **Session Summary — Strategic Transition (June 28, 2026)**.

---

## Milestone — First Real Commercial Generated (June 28, 2026)

Today marks one of the most important milestones in the project.

For the first time, Metaprom successfully transformed a simple cellphone product photo into a commercial scene and generated a cinematic promotional video that produced a genuine WOW reaction.

This validates the core product hypothesis:

> Customers are not buying AI. Customers are buying the feeling of seeing their own product transformed into professional marketing.

### Major Product Discovery

The biggest lesson was not technical. It was experiential.

Metaprom is a **commercial creation platform** with a world-class Creative Director — not an image enhancement platform or AI tool.

The customer should feel they are working with a senior creative director at an agency, not operating software.

### Studio Philosophy

Studio is no longer a page. **Studio IS the product.**

Everything happens inside Studio:

Landing
↓
Login
↓
Studio
↓
Upload Photo
↓
Commercial Image
↓
Commercial Video
↓
Automatic Save
↓
Purchase HD
↓
Continue Creating

No legacy workflows. No dashboard interruptions. No manual saving.

### Product Principles (June 28, 2026)

* The uploaded photo is the strongest signal of intent.
* Intent classification enriches the experience but never blocks creation.
* Saving is invisible.
* The customer never loses work.
* The customer should never adapt to the AI.
* The AI adapts to the customer.

### Creative Direction

The objective is no longer to animate photos. The objective is to create **believable commercials**.

Commercial Image
↓
Commercial Video

The generated image becomes the visual foundation for the generated commercial.

### Development Methodology Discovery

A new product creation workflow has emerged:

Vision
↓
Conversation
↓
ChatGPT Mockup
↓
Founder Review
↓
Cursor Implementation
↓
Customer Test
↓
Iteration

This dramatically reduces the translation gap between product vision and implementation.

Mockups are no longer presentation material. They are **implementation specifications**.

See **AI Development Workflow**.

### Startup Mode Reinforced

Priority order:

1. Launch sooner.
2. Learn faster.
3. Reduce customer friction.
4. Improve architecture.
5. Technical perfection.

Every sprint should end with a real customer test — not with completed code.

### Current Status (June 29, 2026)

| Area | Status |
|------|--------|
| Landing | Functional |
| **`/experience` (canonical journey)** | **Production-wired** |
| Authentication | Functional |
| Studio Experience | Functional — shared services with Experience |
| Commercial Image | **Reliability Sprint complete (20/20)** |
| Commercial Video | Validated — **10 Veo Lite gens/day quota** |
| Customer WOW | First validated |
| Google AI billing | Active — ~MXN 427 prepaid remaining |
| Automatic Product Thinking | Emerging — **Instant Capture** discovery |

### Next Objective (June 29, 2026)

1. **CEO Product Review** — validate `/experience` commercial journey end-to-end
2. **UX Polish** — conversion and friction removal
3. **Veo capacity planning** — scale beyond 10 video gens/day for Beta
4. **Instant Capture** — pre-Beta implementation candidate

The goal is no longer proving that AI works. The goal is proving that Metaprom **consistently delivers a commercial journey customers want to buy** — at Beta scale.

---

## Strategic Pivot – Metaprom AI Evolution (June 2026)

### Important Strategic Realization

A major shift occurred in the vision of Metaprom AI.

The original concept was:

> Improve ecommerce product photos.

The new concept is:

> Manufacture commercial advertising assets.

This is not a cosmetic change. It changes the size of the opportunity, the target customer, the landing page, the beta strategy, and potentially the entire business model.

---

### Two Different Markets

#### Market A – Marketplace Optimization

Target:

* Mercado Libre sellers
* Amazon sellers
* Shopify stores

Problem:

* Need compliant product photos.
* Need better product presentation.
* Need white backgrounds and cleaner listings.

Value:

* Easy entry point.
* Good beta user source.
* Large volume market.

Limitation:

The customer can often find alternative ways to improve photos.

The pain is real but partially solved.

This market should be viewed primarily as an **acquisition channel**.

---

#### Market B – Advertising Content Creation

Target:

* TikTok sellers
* Instagram businesses
* YouTube Shorts creators
* Restaurants and business owners (pymes)
* Ecommerce brands
* Real estate agents
* Amazon and Mercado Libre sellers
* Small businesses

Primary audience is **not AI experts** — experts buy technology; businesses buy results.

Problem:

* Need content constantly.
* Need videos.
* Need social media assets.
* Need marketing materials.

Value:

* Higher willingness to pay.
* More recurring demand.
* Less commoditized.
* Larger long-term opportunity.

Key realization:

The user who needs content to sell is potentially more valuable than the user who simply needs a better marketplace photo.

---

### New Product Positioning

Old positioning:

> AI photo enhancement platform.

New positioning:

> AI-Powered Commercial Content Factory

The goal is not to sell AI tools. The goal is to sell ready-to-use commercial assets.

Metaprom AI should generate:

* Product photography and marketplace photos
* Advertising photos and product hero images
* Lifestyle images and promotional banners
* Social media creatives
* TikTok videos, Instagram Reels, Facebook Reels
* Real estate promotional videos
* YouTube Shorts and marketing assets

The business moves from:

> Improving photos

to

> Producing marketing.

---

### Landing Page Discovery

A critical insight emerged after viewing visual mockups.

The current landing page communicates:

> "I am an AI platform."

The new desired landing page communicates:

> "Look what we can create for you."

This produced a strong emotional reaction from observers.

People did not react to the technology.

People reacted to the outcome.

Important lesson:

The product sells itself visually.

It should be demonstrated, not explained.

---

### Future Landing Philosophy

Metaprom AI should look less like:

* SaaS software
* AI platform
* Technical product

And more like:

* Creative studio
* Advertising factory
* Content generation machine

The website should immediately showcase:

* Before / After transformations
* Product advertising examples
* Social media creatives
* Video examples
* Vertical content

Core principle:

Visual impact first.
Technical explanation second.

See **Public Landing Philosophy** for the official public Preview landing.

---

### Video as Primary Product Candidate

Original focus:

1. Ecommerce photo enhancement

New focus:

1. AI-generated marketing videos (primary product candidate, not future feature)
2. Visual landing page
3. Asset library
4. Beta program

Reason:

Videos create stronger emotional reactions and larger perceived value.

Photos impress.

Videos create "wow" moments.

June 2026 testing observation:

A single AI-generated product video produced a stronger reaction than multiple enhanced images.

Hypothesis:

Video should be treated as a primary product candidate rather than a future feature. Videos may become the strongest commercial differentiator of Metaprom AI.

---

### Competitive Insight

The advantage may not be the AI itself.

The advantage may be:

* Spanish-first experience
* Simplicity
* Prepaid model
* No subscriptions required
* Accessibility for non-technical users

Core belief:

Users do not want to learn AI.

Users want marketing assets.

---

### Key Philosophy

Metaprom AI should not be viewed as:

> A photo enhancement tool.

Metaprom AI should be viewed as:

> A fully automated commercial content factory.

This shift dramatically increases the size of the opportunity and better aligns with long-term business ambitions.

---

### Founder Insight

A defining moment occurred when a visual mockup generated an immediate emotional reaction from a viewer.

The viewer did not care whether the platform was real.

The viewer did not understand the technology.

The viewer simply reacted to the perceived outcome.

This reinforced an important principle:

People buy results.

Not technology.

Metaprom AI should therefore market outcomes, not infrastructure.

See **Video Strategy Discovery (June 2026)** for provider research, economics, and free-tier design.

---

## Video Strategy Discovery (June 2026)

*Video, UX, economics, and market positioning — consolidated June 2026 research.*

**Update (June 2026):** Veo 3.1 Lite integration **validated**. Measured economics documented in **Economic Validation — Veo 3.1 Lite (June 2026)**. Content below includes historical research — items marked preliminary may be superseded.

See also: **UX Philosophy — Kling Analysis Breakthrough (June 2026)** for guided-experience product principles.

### Major Strategic Discovery

Metaprom AI is no longer viewed primarily as an ecommerce photo enhancement platform.

Current vision:

**Metaprom AI = AI-Powered Commercial Content Factory**

The strongest user reaction observed so far has come from AI-generated videos, not enhanced photos.

Research and testing during June 2026 revealed that a single AI-generated product video produced a stronger reaction than multiple enhanced images.

New hypothesis:

Video should be treated as a **primary product candidate** rather than a future feature.

Outputs may include:

* Marketplace photos
* Advertising photos and product hero images
* TikTok videos, Instagram Reels, Facebook Reels
* Product videos and real estate promotional videos
* Social media content and promotional assets

---

### Competitive Research: Kling AI

#### What Kling gets right

Kling creates an exceptional first impression.

The user immediately experiences:

* Cinematic visuals and premium brand perception
* Instant credibility
* Powerful examples
* Strong emotional reaction ("Wow")
* Very low friction for first video generation

This confirms Metaprom AI should evolve toward a **visually spectacular experience** rather than a purely minimalist SaaS interface.

Future homepage direction:

* Before/after transformations immediately visible
* Multiple examples above the fold
* Product photos transforming into professional advertising assets
* Real videos in motion
* Phone mockups displaying TikTok-style content
* Visual proof before technical explanation

The website should immediately communicate:

> "This platform creates photos and videos that sell."

Not:

> "This is an AI platform."

Show first. Explain second.

---

#### What Kling gets wrong

Despite the excellent visual experience, the platform quickly becomes confusing.

Observation:

Even a reasonably technical user became lost navigating the menus. The experience begins feeling like an **aircraft cockpit**.

Examples:

* Multiple creation modes
* Complex navigation
* Credits system
* Advanced settings
* Unclear upgrade path
* No obvious next step after generating a demo

User reaction:

> "What the hell is all this?"

The average business owner, seller, restaurant owner, realtor, gym owner, or TikTok creator is even less technical.

Critical insight:

The biggest competitive advantage for Metaprom AI may not be a better AI model. It may be a dramatically simpler and more guided user experience.

---

### Critical UX Discovery

Most AI platforms appear optimized for agencies, creators, power users, and technical users — then push users into credits, subscriptions, and technical learning after the WOW moment.

Metaprom differentiation: minimize the distance between WOW moment and payment. See **UX Philosophy — Kling Analysis Breakthrough (June 2026)** for the guided-experience model.

---

### Hispanic Market Hypothesis

Research suggests a potentially underserved segment: Spanish-speaking non-technical users.

These users may not want to learn:

* Prompts
* Models
* Credits
* Tokens
* AI workflows

They simply want results.

Potential user thought process:

"I need a video." → "How much does it cost?" → "Where do I pay?"

Research question:

How many Hispanic non-technical users abandon after seeing subscriptions, credits, monthly plans, and payment complexity?

Potential competitive advantage:

Metaprom AI adapts to the user's mental model instead of forcing users to learn ours.

This segment may be underserved. Must validate through beta users.

---

### Free Tier Strategy Discovery

Important realization:

The free tier exists to create trust. It does NOT exist to solve the customer's entire problem.

Purpose:

* Demonstrate capability
* Generate a WOW moment and emotional impact
* Create trust and curiosity
* Encourage conversion

The free tier is not a gift. It is a **customer acquisition expense**.

---

### Video Length Strategy

Current hypothesis:

#### Free

5-second teaser video

* Watermark
* Standard quality
* Limited usage
* Designed for discovery

Purpose:

Generate the "WOW" moment. Not replace the paid product.

---

#### Paid

20-30 second commercial video

* No watermark
* Commercial quality
* Downloadable
* Ready for marketing use

Purpose:

Generate a real business asset.

---

### Watermark Strategy

Potential approach:

Free videos contain:

"Generated with Metaprom AI"

or

"metaprom.com"

Requirements: elegant, small, non-intrusive.

Paid assets: NO watermark.

Goal:

Free users become a distribution channel. Each shared asset becomes marketing for Metaprom AI.

---

### Business Risk Identified

Major concern:

Free users who never intend to become customers.

Examples:

* Multiple accounts
* Repeated free usage
* No purchase intent

Future free-tier design must consider:

* Conversion rates
* Abuse rates
* Cost per generated asset
* Customer acquisition cost (CAC)
* Real generation costs

---

### Provider Strategy

Important architectural principle:

Metaprom AI should NEVER depend on a single video provider.

Architecture:

```
Metaprom AI
|
+-- Google Veo
+-- Kling
+-- Runway
+-- Future providers
```

Customer should never care which engine generates the video.

Metaprom sells:

* Results
* Simplicity
* Commercial value
* User experience

Not specific AI models.

---

### Current Preferred Provider

**Selected for POC/production testing: Google Veo 3.1 Lite**

Model: `veo-3.1-lite-generate-preview`

Decision status (June 2026):

**VALIDATED** — integrated and generating successfully on Metaprom AI paid project.

Earlier status was *INVESTIGATE FIRST — DO NOT COMMIT YET* (see historical note below).

Google technologies:

* Google AI Studio
* Gemini API
* Veo 3.1 (video — primary investigation target)
* Nano Banana (image generation)

Reasons:

* Google ecosystem and enterprise credibility
* Strong long-term investment
* Official API
* Vertical video support
* Image-to-video support
* Better long-term stability than relying on a single experimental provider

Historical note (pre-validation, June 2026):

Previously documented as **INVESTIGATE FIRST — DO NOT COMMIT YET**. Superseded by successful Lite integration and measured economics.

---

### Preliminary Video Economics

Official Google Veo pricing research (June 2026)

#### Veo 3.1 Lite

$0.05 USD / second

Approximate costs:

5s video ≈ $4.75 MXN

10s video ≈ $9.50 MXN

30s video ≈ $28.50 MXN

---

#### Veo 3.1 Fast

$0.10 USD / second

Approximate costs:

5s video ≈ $9.50 MXN

30s video ≈ $57 MXN

---

#### Veo 3.1 Standard

$0.40 USD / second

Approximate costs:

30s video ≈ $228 MXN

Not suitable for MVP testing.

---

### Preliminary Pricing Thoughts

If actual generation costs are near Veo Fast estimates:

Estimated cost: 30-second video ≈ $57 MXN

Potential retail pricing (testing points only — not finalized):

* $99 MXN (entry)
* $149 MXN (recommended testing point)
* $199 MXN (strong candidate)
* $299 MXN+ (premium tiers)

Important:

Profitability depends not only on video cost but also on free users, abuse, CAC, and conversion rates.

Do NOT finalize pricing until real Veo testing is completed.

---

### Critical Open Question

Initial Veo Lite testing **complete** (June 2026) — measured ~1.61 MXN/sec. Full pricing and free-tier strategy still subject to validation.

Need continued measurements:

* Generation cost at scale
* Generation speed
* Conversion rate
* Abuse rate
* Customer willingness to pay (VIDEO PREMIUM at 149 MXN)

---

### New Priority Investigation

Before implementing Video MVP:

Research:

1. Google Veo
2. Kling API
3. Runway API
4. Licensing terms
5. Commercial usage rights
6. Actual generation costs
7. Conversion economics

Goal:

Build a complete Video Economics model before implementation.

---

### Most Important Insight

The opportunity may not be "Better AI."

The opportunity may be **better commercial adaptation for Spanish-speaking users**.

Potential competitive advantages:

* Spanish-first UX
* Simplicity and commercial orientation
* Marketplace users and small businesses
* TikTok creators
* Flexible payment methods
* Reduced friction between WOW and payment

The biggest insight from Kling was not video quality — it was that simplicity and guided UX may matter more than the model.

The biggest opportunity may exist between the moment a user says "WOW" and the moment they successfully pay.

Reducing that distance may become one of Metaprom AI's strongest competitive advantages.

---

## UX Philosophy — Kling Analysis Breakthrough (June 2026)

### Critical Product Insight

A major strategic realization emerged from analyzing Kling and other AI video platforms.

The biggest competitive advantage for Metaprom AI may not be a better AI model.

The biggest advantage may be a dramatically simpler and more guided user experience.

---

### Core Metaprom AI UX Philosophy

Metaprom AI should not be designed as an aircraft cockpit.

Metaprom AI should be designed like **Uber**.

The user should not need to understand:

* AI models
* Credits
* Advanced settings
* Technical parameters
* Prompt engineering

The user should simply say:

> "I want to sell this."

And the system should guide everything else.

Users do not want to learn AI. Users want to sell more.

Most competitors sell AI. Metaprom AI should sell outcomes.

---

### Core Product Principle

> "The user should not navigate Metaprom AI. Metaprom AI should navigate the user."

This becomes a core product philosophy.

Related principles:

* "Adapt to the user's mental model, not vice versa."
* "Do not force users to learn our system to obtain the result they want."

---

### Future Video Flow

Instead of: choose model → choose duration → configure camera → configure motion → configure creativity → configure prompts.

The flow should be:

1. **Upload photo**
2. **What are you selling?** (Restaurant, Real Estate, Fashion, Gym, Ecommerce, Other)
3. **Describe it in one sentence**
4. **Generate**
5. **Wow moment**
6. **Immediate purchase offer**

---

### Critical Sales Insight

Most AI platforms stop after generation. The user receives the result but is not guided toward conversion.

Metaprom AI should actively lead the user.

Example after generating a free demo:

> 🔥 Your video is ready.
>
> Download HD without watermark — $170 MXN [ Buy Now ]
>
> Need videos regularly? Plans from $499 MXN/month

The platform should continue the sales conversation — not leave the user alone after the WOW moment.

---

### Strategic Positioning — UX Contrast

| Competitors | Metaprom AI |
|-------------|-------------|
| "Learn our system." | "Get your result." |
| "Understand credits." | "Buy the finished video." |
| "Navigate the platform." | "Follow the guided path." |

---

### Long-Term Vision

Future success may depend less on having the best AI model and more on creating the most intuitive path from:

Product Photo → Wow Moment → Purchase → Subscription

The goal is not to impress users with technology.

The goal is to remove every obstacle between desire and purchase.

---

## Target Customer (June 2026 Update)

Metaprom AI is evolving into a **marketing content generation platform** — not only an image enhancement tool.

### Primary target

People and businesses that need marketing content but are **not AI experts**.

Examples:

* Restaurants, taquerías, cafés
* Dentists, beauty salons
* Real estate agents
* Small businesses and pymes
* Mercado Libre, Amazon, Shopify, TikTok Shop sellers
* Small content creators
* Local businesses

### Segmentation principle

The segmentation is **not** "TikTok creators vs non-creators."

The segmentation **is** "AI experts vs non-experts."

Metaprom is initially optimized for **non-experts**.

Experts buy technology. Businesses buy results.

See **Market A / Market B** in Strategic Pivot for acquisition vs long-term opportunity framing.

---

## NO BARRIERS. NO NONSENSE.

Core UX principle (June 2026).

Ideal flow:

1. Upload photo
2. Describe product
3. Generate
4. Pay
5. Download
6. Publish

Customers should not need to:

* Learn prompting
* Learn AI tools
* Manage credits
* Understand technical settings

Goal: reduce complexity to the absolute minimum.

Related principles:

* "The user should not navigate Metaprom AI. Metaprom AI should navigate the user."
* Design like Uber, not an aircraft cockpit.
* **Do not explain. Demonstrate.**
* **The user must never feel they are using AI.**
* **You take the photo. Metaprom does the rest.**

See **UX Philosophy — Kling Analysis Breakthrough (June 2026)** and **Product Philosophy**.

---

## Video Generation — Validated (June 2026)

**STATUS: VALIDATED**

Video generation is no longer a future roadmap item. It is a **working capability**.

### Video architecture

See **Video Architecture** and **Official Video Workflows**.

### Current implementation

| Item | Value |
|------|-------|
| Provider | Google Gemini API |
| Model | Veo 3.1 Lite — `veo-3.1-lite-generate-preview` |
| Config | `VEO_MODEL` env var (fallback: `veo-3.1-lite-generate-preview`) |
| API route | `POST /api/video` |
| Test page | `/video-test` (POC) |
| Paid project | Metaprom AI (Google AI Studio) |

### Validated flow

```
Image → Prompt → Veo 3.1 Lite → MP4 → Browser
```

Multiple real generations completed successfully after billing activation and API key migration to the paid Metaprom AI project.

### Technical notes

* Polling via `getVideosOperation()` until operation completes
* MP4 returned to browser via temp download from Gemini Files API
* Not yet integrated: Biblioteca, Supabase video storage, payments, watermarks

See **Current Architecture** and **Roadmap**.

### Quota and billing (June 29, 2026)

| Item | Value |
|------|-------|
| Billing | Active — prepaid ~MXN 427 remaining |
| Monthly usage | ~MXN 72 |
| Veo 3 Lite RPD (Tier 1) | **10 requests/day per project** |
| Beta blocker | Video quota — not cost |
| Scaling path | See **Veo Capacity Planning (June 29, 2026)** |

Official references:

* [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
* [Gemini API pricing — Veo 3.1](https://ai.google.dev/gemini-api/docs/pricing)
* [Vertex AI Veo 3.1 quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate)

---

## Reliability Sprint — Image Generation (June 29, 2026)

**Status: COMPLETE**

### Problem

Intermittent `500 "No image generated"` during commercial journey (~56% success in acceptance testing).

### Root cause

OpenAI `responses.create` returned `status: completed` with **text-only `message` output** — no `image_generation_call`. Same prompt and image; failures in ~4–7 s vs successes in ~40–60 s. Not upload errors, rate limits, content policy, or parsing bugs.

### Fix (`lib/enhancement.ts`)

* `tool_choice: { type: "image_generation" }` — force tool invocation
* Prompt directive against text-only creative replies
* Response validation (`text_only`, `tool_failed`, `empty_result`)
* Bounded retry (up to 3 attempts, backoff)
* Structured logging per attempt

### Measured result

**20/20** successful generations post-fix. Beta target (95%) met.

---

## Veo Capacity Planning (June 29, 2026)

**Status: RESEARCH IN PROGRESS**

### Current constraint

Metaprom uses **`veo-3.1-lite-generate-preview`** via Gemini API (Google AI Studio). Tier 1 paid projects show **~10 RPD (requests per day)** for Veo preview models. This is a **quota** limit, not a billing/credit issue.

### Key findings

| Question | Answer |
|----------|--------|
| Fixed for Tier 1? | **Yes for preview models** — low RPD is documented behavior; exact limits are project-specific in AI Studio |
| Can it increase? | **Yes** — via tier upgrade, rate limit increase request, or migrate to Vertex AI |
| Through AI Studio? | View limits in AI Studio → Rate limits; [request increase form](https://ai.google.dev/gemini-api/docs/rate-limits) |
| Through Google Cloud? | **Vertex AI** — GA models (`veo-3.1-lite-generate-001`) at **50 RPM** fixed quota; Provisioned Throughput for higher volume |
| By upgrading tier? | Tier 2/3 unlock higher limits automatically over time; Veo preview limits remain restrictive |

### Beta recommendation (100+ videos/day)

| Path | Notes |
|------|-------|
| **Short term** | Request Gemini API rate limit increase in AI Studio; monitor RPD in dashboard |
| **Production** | **Vertex AI Veo 3.1** (`veo-3.1-lite-generate-001` or `veo-3.1-fast-generate-001`) — 50 RPM, no 10/day RPD cap |
| **High volume** | Vertex **Provisioned Throughput** (GSUs) — required for predictable 100+ daily at scale |
| **Architecture** | Queue + async job processing; never block UX on synchronous Veo poll; multi-project only as last resort |

**Do not assume credits alone unlock capacity.** Quota and spend-based limits are separate from prepaid balance.

---

## Economic Validation — Veo 3.1 Lite (June 2026)

**STATUS: MEASURED (initial test)**

Documented from a real 5-second commercial generation on the paid Metaprom AI project.

### Observed test

| Metric | Value |
|--------|-------|
| Clip length | 5 seconds |
| Balance before | 500.00 MXN (Google prepaid) |
| Balance after | 491.95 MXN |
| **Observed cost** | **8.05 MXN** |
| **Observed rate** | **~1.61 MXN / second** |

### Approximate projections (observed rate)

| Duration | Estimated cost |
|----------|----------------|
| 8 seconds | ~13 MXN |
| 15 seconds | ~24 MXN |
| 30 seconds | ~48 MXN |

### Conclusion

Economics appear **viable for SMB marketing content** at Veo 3.1 Lite pricing.

Earlier preliminary estimates in **Video Strategy Discovery** used published USD/sec rates — **measured MXN costs take precedence** for product economics.

Pricing and margin models remain subject to validation (CAC, abuse, conversion, revision costs).

See **Video Product Concept — VIDEO PREMIUM**.

---

## Video Product Concept — VIDEO PREMIUM

Initial product concept (June 2026). **Pricing subject to future validation.**

### VIDEO PREMIUM

Includes:

* 3 initial proposals
* 2 quick revisions
* HD download

Principles:

* Clear limits
* Clear expectations
* Avoid unlimited iteration loops

Initial reference price: **149 MXN**

Aligns with preliminary testing point in **Video Strategy Discovery** and observed unit economics.

---

## Content Policy UX (Future)

**STATUS: Future roadmap — not MVP.**

### Problem discovered

AI systems frequently replace restricted content **silently**.

Examples observed:

* Messi, Shakira (celebrities)
* Supertramp (copyrighted music)
* Other restricted IP

### Metaprom principle

**Never silently substitute.**

Instead:

1. Detect restricted content before generation
2. Inform the user
3. Offer compliant alternatives

Examples:

| User input | Compliant alternative |
|------------|----------------------|
| Messi | Professional elite football player |
| Supertramp | Classic rock inspired soundtrack |

### Future feature

**Prompt Compliance Assistant** — pre-generation check with transparent user messaging.

---

## Competitive Positioning — Workflow Over Models (June 2026)

**Strategic conclusion (validated):**

Competitive advantage is **not** access to AI models. Anyone can buy access to Veo.

Competitive advantage comes from:

* Workflow
* Simplicity
* UX
* Distribution
* Customer acquisition
* Niche understanding (Spanish-speaking non-expert SMBs)

The value is moving from the **model** to the **workflow**.

The UI never knows the model. The UI knows only the **Workflow**.

See **Official Video Workflows**, **UX Philosophy**, **NO BARRIERS. NO NONSENSE.**, and **H2 - Video as Primary Product**.

---

## Video Architecture

**Status:** Active product architecture — permanent decision.

All commercial generation must pass exclusively through:

```
Workflow
  ↓
generateCommercialVideo()
  ↓
Vertex Provider
  ↓
Model resolved by Workflow
  ↓
FFmpeg
  ↓
Video
```

Direct calls to Vertex for commercial generation are **prohibited**.

The UI never knows the model. The UI knows only the **Workflow**.

See **Official Video Workflows** and **Video Generation — Validated (June 2026)**.

---

## Official Video Workflows

**Status:** Active product architecture — supersedes direct model references in UI and API routes.

| Workflow | Model | Purpose |
|----------|-------|---------|
| Preview | Veo Lite | **LIVE:** customer acquisition — WOW and sharing. Current teaser/model path unchanged. **APPROVED DIRECTION:** in-Studio AI Video Preview is **PROOF + WOW**, not a shortened Premium. Working finding for the currently relevant **Veo 3.1 Fast** path: 4s generation minimum; customer-facing target ~1–1.5s (**not live**; does not change this LIVE row). Production-account cost **unverified**. Preview Pro / Storyboard **not live**. Preview/Premium differentiation = **LAUNCH PRODUCT GATE**. |
| Premium | Veo Fast | Paid complete commercial |
| Enterprise | Enterprise model | High-volume or enterprise tier |

Model selection is resolved internally by the Workflow layer via `resolveWorkflow()`.

The customer-facing product speaks in workflows and outcomes — never in model names.

All generation flows through `generateCommercialVideo()` → Vertex Provider → FFmpeg. Direct Vertex calls for commercial generation are prohibited.

See **Video Architecture** and **Video Generation — Validated (June 2026)**.

---

## Video Library Strategy (Future)

**STATUS: Future direction — preferred architecture.**

Do **not** create separate video dashboards.

Preferred structure:

```
Biblioteca (Library)
├── Images
└── Videos
```

Unified project history. Videos and images share the same project context.

Current state: Biblioteca stores images only; video POC is isolated at `/video-test` and `/api/video`.

*Historical note — superseded July 1, 2026. See **Biblioteca — Commercial Portfolio (July 1, 2026)** for current product definition.*

---

## Biblioteca — Commercial Portfolio (July 1, 2026)

**Status:** Active product definition — supersedes file-browser framing in sections above.

Biblioteca is **not** a file browser. It is a **Commercial Portfolio** centralized inside Studio.

Each project visually tells one transformation story (**LIVE** current portfolio storytelling):

```
Original Photo
↓
Premium Image
↓
Free Teaser
↓
HD Commercial
```

**The transformation itself is the product.**

**APPROVED PRODUCT DIRECTION (not live — do not implement from this record):** preferred future funnel is PHOTO / CUSTOMER ASSET → CREATIVE DIRECTOR → STORYBOARD / CREATIVE APPROVAL → SHORT AI VIDEO PREVIEW → PREMIUM COMMERCIAL → BIBLIOTECA → DOWNLOAD / SHARE. Deterministic Motion Preview is **REJECTED** as a funnel stage. Whether the future first AI Video Preview remains a free teaser is **OPEN**. Preview/Premium differentiation is a **LAUNCH PRODUCT GATE**. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§4–8, 11 and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

### Persistence

Production database may temporarily lack `projects.destination`. Persistence now includes a graceful fallback so customer workflows continue while production migrations catch up. Failure to persist project state is a production defect.

### UX principles

* Every project row/card should read as a **before → after commercial journey**, not a folder of assets.
* Previews are always available — never downloadable, always shareable with permanent public URL.
* Navigation polish and refresh reliability are production requirements.
* Future UX decisions must reinforce portfolio storytelling — not file management metaphors.

See **Customer Experience (July 1, 2026)** and **Demo Library**.

---

## Public Landing Philosophy

**Status:** Active product definition for public Preview URLs, **reconciled August 18–19, 2026**.

The public Preview page does **NOT** explain AI models.

It sells through **demonstration**, and — as of GTM — the **marketing site / FAQ** must also make the category difference explicit: **GENERAR NO ES PRODUCIR.** Visual premium/minimalism may remain; commercial communication must become substantially clearer. See GTM §5.

Visual order on the public Preview page:

1. Video
2. Created with Metaprom
3. Create yours free
4. *(Future)* Original photo → Preview

First, create emotion.

Then, explain the category (factory vs tool) — not the model stack.

The landing must never communicate "AI platform." It must communicate "look what was created" **and** that Metaprom delivers finished advertising, not generations.

See **Future Landing Philosophy**, **Growth Engine**, **Preview Policy**, and **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §§5 and 13.

---

## Demo Library

**Status:** Active product definition — supersedes any framing of the library as a video showcase.

The Demo Library does **NOT** exist to show pretty videos.

It exists to demonstrate that **anyone** can transform everyday content into premium campaigns.

Official rule:

**Always show the origin. Never repeat the exact same origin.**

Valid origin examples:

* Phone photo
* Downloaded image
* Local folder
* Drag & Drop
* Marketplace

What matters is proving:

> You can do this.

Each demo must tell a transformation story — origin to commercial — so the viewer believes they can replicate it.

See **Biblioteca — Commercial Portfolio (July 1, 2026)** and **Growth Engine**.

---

## Preview Policy

**Status:** **LIVE** permanent rules for current Preview assets remain in force. Future Preview architecture, duration/trim, Preview Pro, first-preview commercial model, and Preview/Premium **LAUNCH PRODUCT GATE**: **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Where they conflict, those updates govern **future direction**. Current Studio teaser/preview behavior is **unchanged**. The short 1–1.5s Preview is **not** live.

The Preview is **NOT** the product.

The Preview is a **permanent growth asset** (public share / acquisition) **and**, in future in-Studio architecture, proof that the customer's own asset became a living professional production.

Its objective is **not** to deliver the complete commercial.

Public-share objective remains: **attract new users**.

In-Studio future objective: create genuine video WOW and desire for Premium without giving the complete narrative away. **APPROVED PRODUCT DIRECTION**, not live.

Permanent **LIVE** rules:

* Never downloadable
* Lives exclusively inside Metaprom
* Always available in Biblioteca
* Permanent public URL
* Unlimited sharing
* Every Preview must generate new users

**LIVE / historical documented characteristics:**

* approximately 3–5 seconds *(LIVE / historical documented characteristic; future customer-facing AI Video Preview target is approximately 1–1.5 seconds from a 4-second Veo source — **not live**; do not implement duration/trim changes from this record)*
* immediate impact
* teaser
* shareable
* Metaprom watermark

The Premium commercial must always feel significantly more valuable than the Preview. **August 19, 2026 finding:** LIVE Preview and Premium are not yet differentiated enough in perceived value. Closing that gap is future architecture.

Premium requests the maximum officially supported Veo clip duration and preserves the customer's selected aspect ratio. Video Extension and clip chaining remain backlog only.

Do **not** treat Storyboard, Preview Pro, Motion Preview, or project-credit accounting as live Preview Policy.

See **Premium Generation**, **Preview vs Premium**, **Growth Engine**, **Public Landing Philosophy**, and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**.

---

## Growth Analytics (Future Vision)

**Status:** Future product architecture plus **pre-launch P0 instrumentation** for Share. Historical vision list below is preserved. Required Share launch events are specified in GTM §13 and are **not** claimed as already complete.

The Growth Engine requires measurement. The following metrics form part of the product vision:

* Views
* Unique Views
* Shares
* WhatsApp Shares
* Copy Link
* CTA Clicks
* Registrations
* Conversions
* Watch Completion %

**Share launch instrumentation (required, not claimed complete):** `share_created`, `share_opened`, `share_to_signup`, `share_to_creation`, `share_to_purchase`.

These metrics connect Preview sharing to new user acquisition and conversion.

See **Growth Engine**, **Preview Policy**, and **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §13.

---

## Hero

**Status:** Layout approved and locked. Future work must preserve these approvals.

The Hero is one of Metaprom's **primary marketing assets**.

### Approved and locked

* Hero layout — **approved**
* Phone mockup — **approved**
* Phone alignment — **locked**
* HTML video alignment — **locked**
* Hero composition — **approved**

Future Hero work must preserve these approvals. Perfection belongs to **Art Direction** and asset refinement — not runtime geometry changes.

### Core message

The Hero must communicate one simple idea:

> **This commercial came from THIS phone.**

### Art direction priorities

1. Commercial fully integrated **inside** the phone
2. Phone as the **visual focal point**
3. Model remains **clearly visible**
4. **Premium advertising composition**

### Runtime freeze

`lib/hero-layout-spec.ts` is frozen.

`HeroPhoneScreen` controls optical presentation only. `HERO_COMMERCIAL_SCALE_Y` and `objectPosition` are optical tuning controls, not geometry fixes.

Future Hero perfection should be achieved by editing `hero-presenter` artwork, not runtime hacks.

See **Hero V2 Rendering Investigation — Complete (July 8, 2026)**.

---

## Premium Generation

Preview remains **lightweight** — a teaser, not the deliverable. **LIVE** current Preview/Teaser behavior is unchanged.

Customers purchase a **result**: a finished professional commercial they are satisfied with — not seconds, not one generation, not retries. Duration targets are internal objectives only. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§1–2, 12.

Premium requests the **maximum officially supported Veo clip duration** and **preserves the customer's selected aspect ratio**.

Future Premium roadmap items — **Video Extension** and **clip chaining** — remain backlog only.

The Premium commercial must always feel significantly more valuable than the Preview. Future architecture must widen that gap (AI Video Preview as proof/WOW; Premium as complete deliverable with Commercial Fidelity). That gap work is **not live**.

See **Preview Policy**, **Preview vs Premium**, **Creative Director**, and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**.

---

## Creative Director

**Status:** Independent product — one of Metaprom's primary competitive advantages. No longer experimental. As of August 18–19, 2026, understood as **DIRECTOR DE PRODUCCIÓN / PRODUCTION DIRECTOR**, not merely “chat with our AI.”

The Director is expected to remain the **primary intelligent interface and production orchestrator** across the platform. Future product decisions should prioritize protecting the Director experience. The customer still buys the **finished advertising asset**; the Director coordinates the factory.

Approved August 2026 Dual Creation direction remains: Director routes user intent into the correct journey — **Commercial** or **Advertising Image** — and may act as a helpful package advisor without exposing internal engines. Historical design record: **MASTER UPDATE — Stripe V1 E2E + Dual Product Architecture (August 2026)**. Current role: **Production Director** coordinating the advertising factory. See **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §6.

The Creative Director / Production Director is:

* Senior Creative Director
* Marketing Expert
* Commercial Storytelling Expert
* Creative Strategist
* Commercial orchestrator (intent routing + package discovery)

The Director accompanies the customer throughout creation, improves **commercial quality**, and should feel like an experienced creative agency. **LIVE:** the Director is integrated after Preview and Premium generation. **APPROVED PRODUCT DIRECTION (not live):** preferred future funnel places Director + Storyboard / creative approval **before** expensive AI video generation. Do not implement Storyboard from this record. The Director is not merely a prompt, but an independent product with personality, principles, behavior, ownership, acceptance criteria, and roadmap.

Official product principles governing the Director are defined in **Product Philosophy**.

### Jurisdiction

The Director **MAY** improve storytelling, pacing, emotional impact, cinematography, scene composition, visual execution, and production quality.

The Director **MUST NOT** — unless the customer explicitly requests rewriting — reinterpret slogans, change positioning, soften claims, replace CTAs, remove websites or phone numbers, change prices, modify promotions, rewrite guarantees, or rewrite commercial copy.

### Mandatory Customer Requirements

Customer-supplied content is mandatory project input. Failure to preserve it is a **production defect**: slogans, URLs, phone numbers, CTA, pricing, offers, discounts, guarantees, promotions, company names, brand names, product names, campaign names, positioning, and commercial copy.

Remembering requirements is the **Director's responsibility** — never the customer's. See **Product Backlog (RC2)** for Mandatory Requirement Tracking and the Director Production Checklist.

### Production Risk

Production Risk and Marketing Language are distinct.

**Production Risk:** copyright, protected logos, celebrity likeness, minors, violence, explicit content, illegal requests, provider generation limitations.

**Marketing language is NOT Production Risk.** Examples that belong to the customer: "The best wine," "The fastest plumbing service," "Premium quality," "Luxury," "50% OFF," "Lifetime warranty."

The Director gates production risks. The Director does not audit advertising claims.

### Personality

Creative. Commercial. Helpful. Optimistic. Collaborative. Marketing-oriented. Production-aware. Supportive.

**Never:** bureaucratic, legalistic, argumentative, preachy, paternalistic, compliance officer, advertising auditor.

### Golden Rules

Customer commercial copy is immutable project input. When in doubt, preserve the customer's original commercial copy — never assume the customer accidentally wrote it. If clarification is required: ask. Never silently modify.

### Product Learning (RC2)

**Advertising-claim blocking** was not primarily caused by Gemini. Investigation demonstrated it originated from the Creative Director prompt itself — the Director had unintentionally evolved into Creative Director + Compliance Officer + Legal Reviewer. The prompt was redesigned to restore intended product behavior.

**LLM instruction generalization:** Large Language Models naturally generalize instructions. Broad rules produce unintended behaviors. Future prompt engineering should define **explicit jurisdiction** rather than broad behavioral principles. This discovery directly influenced the Creative Director redesign.

These are among the most important product discoveries to date.

### Prompt Enrichment Architecture

Customer ideas must **never** be sent directly to the generation model.

```
Customer Idea + Commercial Copy (immutable)
  ↓
Creative Director
  ↓
Expanded Cinematic Prompt (internal)
  ↓
Generation Model
```

The customer writes the idea and supplies commercial copy. The Director shapes creative execution. Metaprom creates the commercial.

See `CREATIVE_DIRECTOR_ARCHITECTURE.md` for implementation specification detail.

---

## Customer Experience (July 1, 2026)

**Status:** Non-negotiable product rule — applies to all customer-facing surfaces.

Provider implementation details must **never** reach customers.

### Never expose

* Vertex
* Provider names (OpenAI, Google, Gemini, Veo, etc.)
* Safety filters
* Technical messages
* Provider error codes

### Failure handling

All failures must be translated into **premium Metaprom messaging** — calm, brand-consistent, action-oriented. The customer experiences Metaprom, not the stack behind it.

Extends **Product principles (non-negotiable)** and **Product Philosophy** — see also **NO BARRIERS. NO NONSENSE.**

---

## Long-Term Positioning

**Status:** Canonical long-term positioning, **reconciled August 18–19, 2026** with factory / production definition. Supersedes "AI Creative Studio" and "image enhancement" framing where they conflict. Current commercial definition: **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §2.

Metaprom is **not**:

* an AI company
* an image enhancement tool
* a video generation tool
* primarily an AI generation tool

Metaprom **is**:

> an **AI-powered advertising production platform / advertising factory** — a commercial creation platform powered by a Production Director

**Product promise:**

> You focus on your business.
> Metaprom produces your advertising.

> The customer explains what they need.
> Metaprom handles the production complexity.

**Final vision:** See **Project Vision**. The Director should become the face of Metaprom as Production Director. What the customer buys is the delivered advertising asset.

**Operational corollary:**

> Take any photo. Describe the commercial. Metaprom creates the production.

**Growth corollary:**

> You take the photo. Metaprom does the rest.

Customers invest time in **describing the commercial**, not in producing a better source photo. Metaprom owns photography cleanup, enhancement, lighting, composition, and commercial creation.

See **Project Vision**, **Creative Director**, **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**, and **Strategic Pivot – Metaprom AI Evolution (June 2026)**.

---

## Ad-Supported Future Model (Future Exploration)

**STATUS: Not MVP. Future strategic option.**

Potential concept: **sponsored generations** — users receive free generations funded by advertisers.

Requires separate economics, compliance, and UX design. Document for long-term exploration only.

---

## Core Principles

1. Adoption before monetization. *(Historical founding principle. As of August 18–19, 2026 the operating loop is BUILD → SELL → OBSERVE → IMPROVE toward a minimum commercially launchable product.)*
2. Focus on solving real business problems.
3. Continuously evaluate tools that dramatically increase productivity.
4. Preserve project knowledge inside the repository.
5. Build globally. Launch pragmatically.
6. Simplicity is a competitive advantage.

---

## Product Philosophy

See also: **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**, **Creative Director**, **NO BARRIERS. NO NONSENSE.**, **UX Discoveries (June 28, 2026)**, **Cinematic Reveal**, **Target Customer (June 2026 Update)**, **Customer Experience (July 1, 2026)**, and **Biblioteca — Commercial Portfolio (July 1, 2026)**.

### Official Product Principles

1. Metaprom does not sell AI access. Metaprom does **not** sell generations. Metaprom sells **results** — finished advertising assets the customer is satisfied with, produced through Creative / Production Direction. **METAPROM DOES NOT SELL GENERATIONS. METAPROM SELLS RESULTS. / METAPROM NO VENDE GENERACIONES. VENDE RESULTADOS.** **The delivered advertising asset is the product.** The Director is the customer's production interface and a primary competitive advantage — not a generator the customer operates. Historical Product Phase language (“The Director is the product”) remains useful history; it is not what the customer buys. Canonical expansion: **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**.

2. The customer owns the marketing message. The Creative Director owns **creative execution**.

3. **Production Risk is NOT Advertising Compliance.**

4. The Director works for the customer. The customer never works for the Director. The customer should never have to convince the Director.

5. **Protect production. Never police creativity.** Production success is more important than theoretical correctness. The Director exists to maximize successful commercial production.

6. Customer commercial copy is **immutable project input** — treat it exactly like uploaded assets. The Director should never force the customer to remember project requirements; remembering requirements is the Director's responsibility.

7. **Never silently rewrite customer commercial copy.** If clarification is required: ask. Never assume.

8. Every interaction with the Director should **reduce customer effort** — never increase it. If the Director creates unnecessary friction, the product has failed.

9. The Director succeeds when the customer **feels understood** — not when the Director demonstrates intelligence.

10. Metaprom competes on **customer confidence**, not on AI capability.

### Core principles

* The customer buys **results** — a finished professional commercial they are satisfied with — **not generations**, not attempts, not compute, not an AI lottery ticket. Internal retries, repair, regeneration, Commercial Rescue, and escalation are Metaprom production concerns. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)**.
* Never expose prompts, models, or technical concepts.
* AI adapts to the customer; the customer never adapts to AI.
* Every screen must reduce friction.
* **Product Experience First.**
* **The WOW stays inside Metaprom.**
* Metaprom sells **transformation, production, and finished advertising**, not AI tools. AI is enabling technology / factory machinery, not the product.

### Supporting principles

* The user should not navigate Metaprom — Metaprom navigates the user.
* Design like Uber, not an aircraft cockpit.
* Users choose outcomes, not AI settings.
* Uploaded photo is the strongest signal of intent.
* Saving is invisible — automatic.
* Library is automatic — no file management.
* Checkout sells the commercial, not the payment.
* Simplicity is a competitive advantage.
* **Correction vs Exploration:** corrections (Metaprom failed to execute approved direction) are part of delivering the purchased product and must not be monetized as Preview Pro. Exploration (customer wants a materially different creative direction) may use optional paid previews. **Not live as a billing system.** See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §3.

Principle:

> Users care about outcomes more than AI.

The customer is not purchasing AI. The customer is purchasing:

* Better product presentation
* Better advertising assets
* Increased perceived professionalism
* The emotional peak of seeing their product as a real commercial
* Partnership with a senior Creative Director

Internal philosophy:

> The customer comes for the result, not the technology.

### UX Principles (permanent)

* **Do not explain. Demonstrate.**
* **The user must never feel they are using AI.**
* **The Preview does not sell a complete commercial.** Public sharing still **sells the next user**. In-Studio, future AI Video Preview = **PROOF + WOW** (not a mini-commercial). Premium = the finished product. Preview/Premium differentiation is a **LAUNCH PRODUCT GATE**. See **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)** and **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§7, 12, 16.
* **You take the photo. Metaprom does the rest.**

These principles apply to every customer-facing surface — Studio, Biblioteca, Public Landing, Demo Library, waiting experiences, and Creative Director conversations.

See **Public Landing Philosophy**, **Demo Library**, and **Growth Engine**.

### Studio Principles (June 28, 2026)

See **Milestone — First Real Commercial Generated (June 28, 2026)** and **Cinematic Reveal**.

* The uploaded photo is the strongest signal of intent.
* Intent classification enriches the experience but never blocks creation.
* Saving is invisible — the customer never loses work.
* The customer should never adapt to the AI; the AI adapts to the customer.
* The objective is believable commercials, not animated photos. **August 19, 2026:** this is why deterministic Motion Preview (zoom/pan of a still) was **REJECTED** as a funnel stage. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §6.
* Commercial Image → Commercial Video: the generated image is the visual foundation for the commercial.
* The WOW moment happens inside Metaprom via **Cinematic Reveal** — before the purchase decision.

Customers care far more about business outcomes than about the underlying AI technology.

---

## Product Backlog (RC2)

**Status:** Strategic product initiatives. **Active objective as of August 18–19, 2026 is GO-TO-MARKET**, not Dual Creation as a BUILD sprint. See **NEXT SESSION START HERE**.

Discovered issues during testing are registered in `RC1_PRODUCT_BACKLOG.md`. The items below are strategic product initiatives.

### ACTIVE NEXT OBJECTIVE (August 18–19, 2026)

**Go-to-Market — minimum commercially launchable Metaprom.**

No new feature without launch justification. Launch lanes: Product / Operations / Market. Public launch planning target: **September 7, 2026**. Canonical detail: **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.

Storyboard, Preview Pro, Motion Preview, refunds, Preview duration/trim changes, and Preview prompt work are **not** next work. They are documented product direction / a rejected experiment / a **LAUNCH PRODUCT GATE** (Preview/Premium differentiation) in **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**. Do not implement them because they are documented. **STOP THE PRODUCT-ARCHITECTURE DETOUR.** Return to the GTM checklist.

### FOUNDATION (no longer the next BUILD sprint)

**Dual Creation Architecture — Commercials + Advertising Images**

Implemented as the current dual-product foundation: one intelligent Director entry point with separate Commercial and Advertising Image journeys. Advertising Image route must terminate as an image product. Historical sprint record: **MASTER UPDATE — Stripe V1 E2E + Dual Product Architecture (August 2026)**. Unknown-customer E2E remains a launch-readiness audit item.

### HIGH

*Not automatically P0. Classify against the GTM launch-readiness framework before pulling into the pre-launch critical path.*

**Creative Director Certification Suite**

The Director should have its own permanent acceptance suite. Every release should validate: slogans, CTA, URLs, pricing, promotions, guarantees, websites, phone numbers, logos, products, brands, editing requests, copyright, celebrities, minors, violence, and provider limitations. The Director is certified only after passing the complete suite.

**Mandatory Requirement Tracking**

The Director should internally maintain structured mandatory customer requirements — website, phone, CTA, slogan, logo, pricing, promotion, offer, guarantee, product, brand — and never rely on conversational memory alone.

**Director Production Checklist**

Before commercial generation, the Director should internally verify every mandatory customer requirement is included (website, phone, CTA, pricing, promotion, product name, brand, slogan). Only then should production begin.

Also: Promotion Engine, Coupon Engine, Founder Credits, Persistent Creative Director memory.

### MEDIUM

**Commercial Copy Verification**

Future Director versions should verify mandatory customer commercial elements actually appear in the generated commercial — website visible, phone visible, CTA visible, slogan visible, logo visible. Verification occurs after generation.

Also: Premium Video Extension, clip chaining, Story Planner, multi-scene generation.

**Storyboard / Preview Pro (August 19, 2026):** **APPROVED PRODUCT DIRECTION**, not a launch-checklist item and **not** automatically launch-blocking. Storyboard is creative approval before expensive video generation — **not** a replacement for video WOW. Preview Pro is optional **exploration** (not correction); paid Preview Pro amounts should credit toward the same project's Premium Commercial. Exact name, price, model/duration, and accounting remain **OPEN**. Deterministic Motion Preview is **REJECTED**. Preview/Premium differentiation is a **LAUNCH PRODUCT GATE**. Do **not** implement from this backlog. Historical **Story Planner** is not the Storyboard decision. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** and **MASTER UPDATE — Preview Duration + Preview/Premium Launch Gate (August 19, 2026)**.

### LOW

* Director analytics
* Conversation scoring
* Prompt quality metrics

---

## Strategic Positioning

### June 2026 — Product Experience First (June 28, 2026 update)

Metaprom is positioned as a **world-class commercial product experience** — not an AI platform.

The AI engine is mature enough for Beta. Customers respond to **emotional peaks** and professional results, not AI terminology.

Working principles:

* The customer buys the transformation, not AI.
* The WOW stays inside Metaprom (**Cinematic Reveal**).
* Checkout sells the commercial, not the payment.

See **Executive Summary** and **UX Discoveries (June 28, 2026)**.

### June 2026 – Strategic Pivot (preserved)

Metaprom is repositioning to an **AI-Powered Commercial Content Factory** — selling ready-to-use commercial assets, not AI tools.

Market A (marketplace optimization) serves primarily as acquisition.

Market B (advertising content creation) represents the larger long-term opportunity.

Landing and marketing should demonstrate outcomes visually — creative studio, not SaaS.

Video is a **validated capability** (Veo 3.1 Lite on Metaprom AI paid project). See **Video Generation — Validated (June 2026)**.

UX philosophy: guided experience like Uber, not cockpit complexity. Metaprom navigates the user from **Cinematic Reveal** to premium offer to purchase. See **NO BARRIERS. NO NONSENSE.** and **Cinematic Reveal**.

---

## Revenue Strategy (July 10, 2026)

**Status:** HISTORICAL company-objective language from July/August Test Mode era, **reconciled August 18–19, 2026**. Current objective is GO-TO-MARKET: SELL → OBSERVE → IMPROVE at MXN $180 Commercial for initial market validation. Live Mode is enabled. See **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.

Revenue remains a primary company objective.

Previous objective:

> Finish the product.

July 10 objective:

> Generate revenue.

The **Revenue Sprint** began after Sprint 3.2.

**August 2026 Test Mode milestone (historical):** Commercial Stripe V1 package checkout reached successful real-domain Test Mode E2E on www.metaprom.com (1 Commercial — MXN $180).

**August 18, 2026 (current):** Stripe Live operational. Webhook 307 incident RESOLVED. Purchase #34 async $99 Advertising Images recovered through normal webhook flow. Purchase #35 $180 Commercial previously fulfilled via return/polling and must remain idempotent.

Stripe is selected as the payment platform after commercial evaluation and after considering previous experience with chargebacks and payment providers.

Strategic reasons for Stripe:

* Fraud prevention.
* Radar.
* Smart Disputes.
* 3D Secure.
* Strong support for digital businesses.
* Mexican payment methods.
* OXXO.
* SPEI.
* Excellent documentation.
* Professional commercial support.

Primary milestone:

> The first happy paying customer.

---

## Payment Philosophy (July 10, 2026)

**Status:** Non-negotiable conversion principle.

Never ask for payment before the WOW moment.

Official sequence:

```
User uploads photo
↓
Commercial generated
↓
User experiences WOW
↓
User wants to own the commercial
↓
Payment
↓
HD download
```

The product demonstrates value before requesting money.

Checkout sells ownership of the commercial, not access to technology.

---

## Growth Engine (July 10, 2026)

**Status:** Current growth philosophy — see **Growth Engine** in **MASTER UPDATE — RC1.3.5 Product Review (CEO Review) (July 2026)** for canonical acquisition flow.

Marketing is no longer considered traditional advertising.

Growth is based on **demonstration** and **curiosity**.

The Preview is a permanent acquisition channel — not a downloadable file. That **LIVE** growth job remains. Future in-Studio AI Video Preview also has a capability-proof / WOW job that must not give away the complete Premium. See **MASTER UPDATE — Product Philosophy + Preview Architecture (August 19, 2026)** §§7, 16.

Official acquisition flow:

```
User
  ↓
Generates Preview
  ↓
Biblioteca
  ↓
Share
  ↓
Public Landing
  ↓
Watches the commercial
  ↓
Create yours free
  ↓
New user
```

Sharing is a consequence of pride, not an obligation.

The goal is to make customers naturally want to show their commercial.

Every Preview must generate new users.

See **Public Landing Philosophy**, **Demo Library**, and **Growth Analytics (Future Vision)**.

---

## Marketing Philosophy (July 10, 2026)

**Status:** External communication rule, **reconciled August 18–19, 2026**.

Never market AI models.

Never require users to understand prompts, tokens, or model choice.

Never compete on models.

Never explain generation technology — **demonstrate production results**.

**GTM addition:** do educate the **category difference** — generation vs production, tool vs factory, DIY vs Metaprom does the production — clearly enough to answer “why pay if AI can be free?” without teaching the customer to become an AI operator. See GTM §§3–5.

Compete on:

* results
* finished advertising assets
* premium perception
* simplicity
* transformation stories (origin → commercial)

---

## Launch Strategy (July 10, 2026)

**Status:** HISTORICAL launch positioning (July 10, 2026). Current calendar, lanes, and P0/P1/P2 framework: **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)** §§17–19. Public launch planning target: **September 7, 2026**.

Do **NOT** position Metaprom as:

* startup
* beta
* experimental
* early company

Position Metaprom as:

> A premium commercial platform that has dramatically reduced production costs through AI.

Price should communicate **opportunity**, not immaturity.

---

## Project Evolution

### Origin

Original idea:

Acquire and potentially sell the Metaprom.com domain.

Outcome:

The opportunity evolved into building a business around AI-powered commercial asset creation.

---

### Strategic Evolution

Initial concepts explored:

* General AI marketing assets
* Real estate content enhancement

Previous focus (pre-pivot):

* Ecommerce sellers
* Marketplace-ready content
* Product photography enhancement

Current focus (June 28, 2026 — Product Experience First):

* **Commercial MVP** — Studio → Cinematic Reveal → checkout → Library
* **Product Experience First** — AI engine mature for Beta; UX is the bottleneck
* Cinematic Reveal as signature premiere experience
* Provider-agnostic payments (`lib/payments/`)
* Automatic Library — Storage-backed persistence
* Mockup-first workflow for all major UI
* Landing + Studio visual continuity (post-MVP, mockups required)
* Beta launch for non-expert SMBs
* Marketplace photo enhancement as acquisition channel (Market A)

---

## Current Product Status

*HISTORICAL June 2026 status table. Current operating truth: **Current State** and **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

### Completed (AI Engine — Phase 1)

* OpenAI integration — commercial image generation
* Google Gemini + Veo 3.1 Lite — cinematic video (**validated**)
* First real customer WOW (**June 28, 2026**)
* Video economics measured (~1.61 MXN/sec)
* Supabase + Google OAuth + ownership layer
* RLS migration prepared
* Zoho email migration (metaprom.com)

### Completed (Product Experience — Phase 2, June 28, 2026)

* **Studio workflow** — intent → upload → generation → Cinematic Reveal → premium offer → checkout
* **Cinematic Reveal** — fade → Infinity logo → fullscreen premiere → offer (`CinematicReveal.tsx`)
* **Sprint 1** — automatic Library persistence (original, enhanced, video, prompts, metadata) via Supabase Storage
* **Sprint 2** — free teaser (watermark, 3–5 s) + premium tier + provider-agnostic payments
* Payment abstraction — `lib/payments/` + checkout/webhook APIs (mock provider)
* Premium video generation — `POST /api/studio/premium-video`
* Mockups — Checkout + Library HTML/PNG previews (`docs/mockups/`)
* Strategic documentation — Product Experience First transition

### In progress

* Supabase migration execution (Storage bucket, purchases, RLS)
* Mockup approval → Library + Checkout UI redesign
* Membership system (mockup pending)
* Landing + Studio visual continuity (mockup pending)
* Download center (mockup pending)

### Near-term (Beta path)

1. Complete commercial MVP end-to-end validation
2. Membership system
3. UX refinement (approved mockups only)
4. Beta launch

### Obsolete priorities (superseded June 28, 2026)

The following are **no longer primary sprint goals** — preserved for historical context only:

* Multi-industry AI consistency as top priority (replaced by commercial MVP)
* "Improve generation quality" as objective (AI engine mature for Beta)
* In-Studio payment as "not started" (Sprint 2 shipped — provider integration pending)
* Separate video dashboard (Library is automatic, unified)

---

## Roadmap

Structured view of product progress (June 2026). **HISTORICAL tables.** Current operating objective: GO-TO-MARKET — see **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**. **Product Experience First** — see **Executive Summary** and **Product Completion Roadmap (June 2026)**.

### Completed — AI Engine (Phase 1)

| Item | Status |
|------|--------|
| Image + commercial generation (OpenAI) | Shipped |
| **Image reliability sprint** | **Complete (June 29, 2026 — 20/20)** |
| Veo 3.1 Lite video | **Validated** — 10/day quota on Tier 1 |
| First customer WOW | **Validated (June 28, 2026)** |
| Video unit economics | Measured |
| Google OAuth + ownership | Shipped |
| Strategic repositioning | Documented |
| **`/experience` canonical flow** | **Shipped (June 29, 2026)** |
| Shared production services (`lib/studio-creation.ts`) | **Shipped** |

### Completed — Product Experience (Phase 2)

| Item | Status |
|------|--------|
| Studio workflow | **Functional** |
| **Cinematic Reveal** | **Shipped** |
| Sprint 1 — Library auto-persistence (Storage) | **Shipped** (apply migration) |
| Sprint 2 — teaser + premium + payments | **Shipped** (mock provider) |
| Payment abstraction | **Shipped** |
| Checkout + Library mockups | Ready for review |
| Product Experience pivot documented | June 28, 2026 |
| Reliability Sprint (`lib/enhancement.ts`) | **June 29, 2026** |

### Current priorities (official — June 29, 2026) — HISTORICAL

*HISTORICAL June 29, 2026 Roadmap table. Current objective: GO-TO-MARKET. See **NEXT SESSION START HERE**.*

| # | Priority | Status |
|---|----------|--------|
| 1 | **CEO Product Review** | **Next** |
| 2 | **UX Polish** | Pending |
| 3 | **Instant Capture** | Discovery — pre-Beta |
| 4 | **Beta launch** | Pending |
| 5 | Complete commercial MVP | In progress |
| 6 | Veo capacity for Beta (100+ videos/day) | Research in progress |
| 7 | Membership system | Not started |

### Blocked on mockup approval

| Item | Brief |
|------|-------|
| Library UI redesign | `docs/mockups/library-brief.md` |
| Checkout UI polish | `docs/mockups/checkout-brief.md` |
| Membership dashboard | `docs/mockups/membership-brief.md` |
| Download center | `docs/mockups/download-center-brief.md` |
| Landing + Studio unified | `docs/mockups/landing-studio-brief.md` |

### Future (post-Beta)

| Item | Notes |
|------|-------|
| Production payment provider (Mercado Pago, etc.) | Via `lib/payments/` |
| Subscriptions | After one-time purchase validated |
| Aspect ratio automation | Invisible to user |
| Multi-provider video | Provider-agnostic architecture |
| Content policy UX | Never silent substitution |

---

## Current Architecture

*Infrastructure snapshot. Customer journey below is the historical Commercial-centric path. Current dual-product foundation is Dual Creation (Commercial + Advertising Image) coordinated by the Production Director. Current operating objective: GO-TO-MARKET. See **MASTER UPDATE — Go-to-Market Transition (August 18–19, 2026)**.*

### Commercial product journey

See **Commercial Product Journey**. The architecture serves one continuous premium experience:

```
Landing → Login → Studio → Upload → Generation
  → Cinematic Reveal → Premium Offer → Checkout → Library → Download Center
```

### Infrastructure

| Layer | Technology |
|-------|------------|
| Domain | metaprom.com (production) |
| Frontend | Next.js, TypeScript |
| Hosting | Vercel |
| Database | Supabase (Postgres + Storage + Auth) |
| AI — Image | OpenAI (`/api/enhancement` → `lib/enhancement.ts`) |
| AI — Video | Google Gemini API — Veo 3.1 Lite (`/api/video`, `/api/studio/premium-video`) |
| Shared journey services | `lib/studio-creation.ts` (Experience + Studio) |
| Video processing | `lib/video-processing.ts` (ffmpeg — tier, watermark, trim) |
| Payments | `lib/payments/` — provider-agnostic (mock dev) |
| Library persistence | `lib/studio-persistence.ts`, `lib/library-storage.ts` |
| Signature UX | `components/studio/CinematicReveal.tsx` |

Environment variables: `GEMINI_API_KEY`, `VEO_MODEL`, `PAYMENT_PROVIDER`, Supabase keys.

### Authentication

* Supabase Auth — Google OAuth (primary)
* Supabase SSR session architecture
* Ownership: `auth.users.id` → `projects.user_id` → `assets`

### Development environment

| Tool | Role |
|------|------|
| **Cursor** | CTO — implementation, refactoring, technical architecture |
| **ChatGPT** | Product design — UX, mockups, commercial experience |
| **GitHub** | Repository |
| **Roberto** | CEO — vision, strategy, approval |

See **Team Roles**, **Official Development Workflow**, and **Authentication Architecture**.

---

## Infrastructure & Operations

### Email — Zoho Migration (June 2026)

Status: completed successfully.

Domain: metaprom.com

Provider: Zoho Mail

Issues resolved during migration:

* Incorrect SPF record inherited from GoDaddy
* Residual Outlook MX records blocking proper routing
* Email reception restored after DNS cleanup
* Alias roberto@metaprom.com confirmed operational

Lesson:

Internal infrastructure milestones (email migration, DNS fixes) do not equal product value delivered to users. Track separately from product progress.

---

## Authentication Architecture

### June 2026

Decision:

* Google OAuth is the primary authentication method.
* Supabase Auth is the authentication provider.
* Supabase SSR is the session architecture.
* Authentication and ownership are separate concerns.
* User ownership will be enforced through projects.user_id.
* Assets inherit ownership through their parent project.
* Row Level Security (RLS) is the long-term security boundary.
* Authentication was implemented in phases to avoid breaking Biblioteca.

Current status:

* Google OAuth flow implemented and validated end-to-end.
* Google user creation successfully verified in Supabase Auth.
* Login, callback and sign-out routes implemented and tested.
* Supabase SSR session architecture validated.
* Ownership complete at the application layer.
* Google OAuth user identity linked to projects.user_id.
* Project visibility filtered by user ownership.
* Asset access validated through project ownership.
* Authenticated Supabase client used for Biblioteca operations.

Remaining security work:

* Row Level Security (RLS) activation and validation

Migration prepared:

* supabase/migrations/20260620120000_biblioteca_rls.sql

---

## Strategic Hypotheses

### H1 - Adoption Through Images

Image enhancement should primarily function as an acquisition channel.

The objective is to attract and retain users through immediate value.

Rationale:

* Images create immediate value and encourage adoption.
* Images generate sharing behavior and word-of-mouth distribution.
* Images create emotional responses based on pride, ownership and professional presentation.

Status:
Active hypothesis.

---

### H2 - Video as Primary Product

Demand for commercial video content is already proven.

Metaprom treats video as a **validated primary product** — Veo 3.1 Lite POC complete (June 2026).

Rationale:

* Videos generate significantly stronger emotional response than photos (June 2026 testing).
* Videos have significantly higher perceived business value.
* Video generation may support premium pricing, pay-per-use pricing, or marketplace-specific offerings.
* Images and video are complementary rather than competing features.

Relationship to H1:

Image enhancement is primarily an acquisition channel (Market A).

Video generation is currently considered the most likely monetization engine and the strongest commercial differentiator (June 2026 strategic pivot).

Status:
**Validated POC (June 2026).** Measured economics: ~1.61 MXN/sec. See **Economic Validation — Veo 3.1 Lite** and **Video Product Concept — VIDEO PREMIUM**.

Key insight (June 2026):

Competitive advantage is workflow and UX for non-experts — not model access.

---

### H3 - Hispanic Ecommerce Opportunity

The Hispanic ecommerce market may be underserved by advanced AI content tools.

The opportunity is not based on language alone but on understanding the workflows, needs and purchasing behavior of Hispanic sellers.

The opportunity may come from:

* Simpler workflows.
* Lower friction.
* Localized onboarding.
* Local payment preferences.
* Better adaptation to the needs of Hispanic ecommerce sellers.

Video-specific hypothesis (June 2026):

Spanish-speaking non-technical users may not want to learn prompts, models, credits, tokens, or AI workflows. They may prefer: "I need a video" → "How much?" → "Where do I pay?" Metaprom should adapt to the user's mental model. Must validate through beta.

Status:
Requires validation through beta users.

---

### H4 - Pay-Per-Result Model

Hispanic sellers may respond more favorably to transactional purchases than recurring subscriptions.

Examples under consideration:

* Video previews
* Pay-to-unlock exports
* One-time purchases
* Local payment methods

Video tier hypothesis (June 2026):

* Free: 5-second teaser (watermarked, standard quality, discovery-only) — creates trust and WOW, not full solution. Treated as customer acquisition expense.
* Paid: 20-30 second commercial (no watermark, commercial quality, downloadable, marketing-ready).

Preliminary retail pricing (testing points only, if Veo Fast costs hold):

* $99 / $149 / $199 / $299+ MXN for 30-second commercial.

**VIDEO PREMIUM** initial reference: **149 MXN** (3 proposals, 2 revisions, HD download). See **Video Product Concept — VIDEO PREMIUM**.

Observed Lite cost: ~1.61 MXN/sec — economics appear viable at 149 MXN price point (subject to revision/abuse/CAC validation).

Principle:

Do not force users to learn the business model before obtaining value. Adapt to the user's mental model.

Potential future payment methods:

* OXXO
* SPEI
* Credit/Debit Cards
* Subscription plans
* Pay-per-generation
* Pay-per-export

Principle:

Reduce payment friction whenever possible.

Status:
Partially validated — unit economics measured on Lite; pay-per-result packaging (VIDEO PREMIUM) subject to beta validation.

---

### H5 - Transformation First Acquisition

Traditional software onboarding may create unnecessary friction.

A potentially stronger acquisition strategy is to demonstrate value before asking users to adopt the platform.

Examples:

* Marketplace listings
* Product photos
* Restaurant products
* Flower shops
* Artisan products
* Small business advertising assets

Potential workflow:

Public asset
↓
Metaprom transformation
↓
Immediate visual impact
↓
Conversation
↓
Beta user

Principle:

Show value before asking for adoption.

Status:

Requires beta validation.

---

### H6 - Pride Driven Sharing

Small business owners may voluntarily share transformed assets because the transformation improves the perceived quality of their own business.

The sharing behavior is driven by pride, ownership and professional presentation rather than by a desire to promote Metaprom.

Examples:

* Product catalogs
* Restaurant assets
* Flower shops
* Marketplace listings
* Small business advertising materials

Potential effect:

Transformation
↓
Pride
↓
Sharing
↓
Word-of-mouth
↓
New prospects

Principle:

People share assets that make them look more professional.

Observation:

The user is often not sharing Metaprom.

The user is sharing their own improved business image.

This distinction may be important to future acquisition strategy.

Relationship to H1 and H5:

Pride-driven sharing may amplify acquisition through images and transformation-first outreach.

Status:

Requires beta validation.

---

## Localization Strategy

Decision:

Build Metaprom as a localization-ready platform from the beginning.

Go-To-Market:

Spanish-speaking ecommerce sellers first.

Implementation:

All user-facing text should be prepared for multilingual support.

Initial languages:

* Spanish
* English

Reason:

Low implementation cost today and high strategic flexibility in the future.

---

## Beta Strategy

*Updated July 1, 2026 — see **MASTER UPDATE — July 1, 2026** for Sprint 3.2 and Public Beta sequencing.*

**Current phase:** Sprint 3.2 — Final Beta Polish (Biblioteca reliability/navigation, Hero art direction, premium rejection messaging).

**Next:** Sprint 4 — Payments → **Public Beta**.

Current objective:

Acquire the first 20 beta users.

Priority:

Feedback is more valuable than scale during the beta phase.

Do not confuse easiest users to recruit with best customers.

Primary segmentation (June 2026): **AI experts vs non-experts**. Metaprom optimized for non-experts. See **Target Customer (June 2026 Update)**.

Recommended beta structure (June 2026 pivot):

Group A – Marketplace sellers:

* Mercado Libre, Amazon, Shopify sellers
* Primary role: acquisition and volume feedback

Group B – Social content creators:

* TikTok creators, Reels creators, social sellers
* Primary role: test willingness to pay for content

Group C – Real estate professionals:

* Primary role: test adjacent vertical demand

Goal:

Identify where willingness to pay is highest.

Avoid recruiting only Mercado Libre users — marketplace sellers optimize photos; they are not necessarily the highest-value future customers.

Current acquisition experiments:

* Direct business outreach.
* Transformation-first demonstrations.
* Marketplace prospecting.
* Small business outreach.
* Before/after visual demonstrations.

Principle:

A small number of highly engaged users is more valuable than a large number of passive signups.

Target:

20 active beta users.

Additional Observation:

The objective of the beta is not only user acquisition.

The beta should also measure:

* Sharing behavior
* Referral behavior
* Repeat usage
* Word-of-mouth effects
* Perceived business value

Potential Success Metrics:

* Number of beta users
* Number of active beta users
* Number of repeat users
* Number of referrals
* Number of shared transformed assets
* Number of businesses requesting additional transformations

Principle:

Engagement and sharing may be more valuable than raw signup volume during the beta phase.

---

## Lessons Learned

### June 2026

Project Memory

Project complexity exceeded what could reliably be preserved through chat history.

Decision:

Maintain a living project memory inside the repository.

Implementation:

METAPROM_MASTER.md

Additional observations:

* Repository memory is more reliable than chat memory.
* METAPROM_MASTER.md is the primary source of institutional knowledge.

---

### June 2026

Development Process

* Small phased deployments reduce risk.
* Preserve working systems while introducing new architecture.
* Diagnose before implementing.
* Validate before optimizing.

---

### June 2026

Development Acceleration

Tools such as Cursor, Codex and AI-assisted workflows can create order-of-magnitude productivity gains.

Decision:

Continuously evaluate new tools and workflows.

---

### June 2026

Biblioteca Asset Storage

Issue:

Assets could not be saved to Biblioteca.

Root Cause:

Supabase RLS blocked inserts into the assets table.

Resolution:

Adjusted database permissions to allow asset insertion.

Result:

Biblioteca asset storage works correctly.

---

### June 2026

Biblioteca and Authentication

* Database permissions and RLS can create hidden integration issues.
* Working software should be protected during major architectural changes.
* Authentication, ownership and security should be implemented as separate phases.

---

### June 2026

Google OAuth Validation

Result:

Google OAuth was successfully validated end-to-end.

Verified components:

* Google Cloud OAuth Client
* Supabase Google Provider
* OAuth callback configuration
* User creation inside Supabase Auth
* Session persistence

Outcome:

Checkpoint A completed.

Remaining security work:

* Row Level Security (RLS)

---

### June 2026

Ownership Layer Completed

Result:

Biblioteca projects are now associated with authenticated users through projects.user_id.

Implementation:

* Google OAuth identity is linked to project ownership.
* New projects automatically store auth.users.id in projects.user_id.
* Project visibility is restricted through user ownership filtering.
* Asset ownership is inherited through the parent project.
* Biblioteca operations now use the authenticated Supabase client.

Validation:

* Project creation successfully stores user_id.
* Users only see their own projects.
* Ownership was validated end-to-end through Google OAuth.
* Legacy projects with user_id = NULL are excluded from user views.

Status:

Ownership complete.

Remaining security work:

* Row Level Security (RLS)

---

### June 2026

RLS Planning Completed

Observation:

Ownership must be established before RLS can be safely enabled.

Result:

A complete RLS rollout plan and migration script were prepared for:

* public.projects
* public.assets

Ownership model:

auth.users
↓
projects.user_id
↓
assets.project_id
↓
project ownership

Planned enforcement:

Projects:

auth.uid() = user_id

Assets:

Ownership inherited through parent project.

Migration:

supabase/migrations/20260620120000_biblioteca_rls.sql

Status:

Migration prepared.

Pending execution and validation.

---

### June 2026

Schema Drift Discovered

Observation:

The repository schema and live Supabase schema are not fully aligned.

Examples:

* projects.description exists in repository schema but not in the live database.
* projects.id differs between repository schema and live database.
* Repository assumptions should not be considered authoritative without verification against the live database.

Impact:

A project creation failure occurred when the application attempted to insert a non-existent description column.

Resolution:

Project creation now ignores description until the schema is reconciled.

Lessons Learned:

Repository schema should periodically be reconciled against the live database.

Status:

Known technical debt.

Non-critical.

---

### June 2026

Development Rule

Before major database changes:

1. Compare repository schema against live Supabase schema.
2. Validate assumptions against the live database.
3. Deploy schema changes through migrations whenever possible.
4. Treat the live database as the source of truth when discrepancies exist.

Reason:

The ownership implementation exposed schema drift between the repository and the live Supabase environment.

---

### June 2026

Transformation First Outreach

Observation:

Providing an unsolicited transformation of a prospect's existing product photo may create substantially more engagement than traditional software outreach.

Potential workflow:

Prospect photo
↓
Metaprom transformation
↓
Immediate visual impact
↓
Conversation
↓
Beta user

Rationale:

The prospect does not need to imagine the value.

The value is demonstrated before adoption is requested.

Relationship to H5:

This outreach pattern operationalizes the transformation-first acquisition hypothesis.

Status:

Early evidence is encouraging.

Requires structured beta validation.

---

### June 2026

Strategic Pivot – Advertising Content Factory

Observation:

Metaprom's vision shifted from improving ecommerce product photos to manufacturing commercial advertising assets.

Impact:

* Target customer expanded beyond marketplace sellers.
* Landing page strategy must shift from AI platform to visual outcome demonstration.
* Beta strategy revised to test multiple segments (marketplace, social, real estate).
* Video elevated to primary strategic differentiator.

Status:

Active strategic direction.

---

### June 2026

Video Strategy Discovery — Economics & Market Positioning

Observation:

Video elevated from strategic priority to primary product candidate. Strongest reaction from AI-generated product video vs enhanced images. Kling research: show transformation first; minimize WOW-to-payment distance. Hispanic non-technical users may prefer simple "how much / where do I pay" flow.

Impact:

* Google Veo provisional leader — **investigate first, do not commit yet**.
* Free tier = customer acquisition expense (5s WOW teaser); paid = 20-30s commercial.
* Preliminary pricing testing points: $99 / $149 / $199 / $299+ MXN (not finalized).
* Complete Video Economics model required before Video MVP (includes CAC, abuse, conversion).

Status:

Investigation phase — provider research and economics modeling before implementation.

Historical note: Video POC and initial economics **validated June 2026**. See **Video Generation — Validated** and **Economic Validation — Veo 3.1 Lite**.

---

### June 2026

UX Philosophy — Kling Analysis Breakthrough

Observation:

Kling excels at visual WOW but fails post-demo with cockpit complexity (credits, modes, unclear next steps). Even technical users get lost; business owners would fare worse.

Impact:

* Core principle: "Metaprom AI should navigate the user."
* Design like Uber: upload → what are you selling → one sentence → generate → WOW → immediate purchase offer.
* Homepage: visually spectacular (cinematic examples, phone mockups, videos in motion) — not minimalist SaaS.
* Platform must continue sales conversation after generation, not stop at delivery.
* Long-term path: Product Photo → WOW → Purchase → Subscription.

Status:

Active product philosophy — applies to landing page, video flow, and conversion UX.

---

### June 2026

Zoho Email Migration

Observation:

Email migration from prior provider to Zoho completed. DNS issues (SPF, residual MX) caused temporary reception failures before resolution.

Impact:

* roberto@metaprom.com alias operational
* metaprom.com email infrastructure stable for business communications

Lesson:

Do not confuse completed internal process with user-facing value delivery.

Status:

Complete.

---

### June 2026

Veo 3.1 Lite Integration — Validated

Observation:

Video generation POC completed using Google Gemini API and `veo-3.1-lite-generate-preview`. Flow validated: Image → Prompt → MP4 → Browser. Required paid Metaprom AI project, prepaid billing, and new API key after initial free-tier key returned 429.

Impact:

* Video moved from roadmap to validated capability
* Lite selected as default model (`VEO_MODEL` env var)
* Measured cost: ~8.05 MXN for 5s (~1.61 MXN/sec)

Status:

Validated — not yet in Biblioteca or production UX.

---

### June 2026

API Key / Project Association

Observation:

Initial API key was tied to a different (free-tier) project. Veo returned 429 despite billing on Metaprom AI. New key created under paid Metaprom AI project resolved generation access.

Lesson:

Billing on project A does not apply to keys issued under project B. Always create keys explicitly under the paid project.

Status:

Resolved.

---

### June 2026

Content Policy — Silent Substitution

Observation:

AI video/image systems may silently replace restricted content (celebrities, copyrighted music).

Metaprom principle: never silently substitute. Future Prompt Compliance Assistant.

Status:

Future roadmap.

---

## Session Summary — Strategic Transition (June 28, 2026)

**This session marks a strategic transition for the project.**

Metaprom officially moved from **AI-first** to **Product Experience First**. The AI engine is mature enough for Beta. All engineering and product effort now serves the commercial customer journey.

### Strategic change

| Before | After |
|--------|-------|
| Improve AI generation | Complete premium commercial experience |
| WOW after download | WOW inside Metaprom (**Cinematic Reveal**) |
| AI experimentation sprints | Commercial MVP → Beta |
| Ad-hoc UI | Mockup → review → approval → implementation |

### Shipped this session

**Sprint 1 — Automatic Library**

* Supabase Storage bucket (`library`) + migration
* Auto-persistence: original, enhanced, video, prompts, project metadata
* `lib/studio-persistence.ts`, `lib/library-storage.ts`

**Sprint 2 — Commercial flow**

* Free teaser: 3–5 s, watermark, medium quality (`lib/video-processing.ts`)
* Premium: 10–15 s HD, no watermark (`/api/studio/premium-video`)
* Provider-agnostic payments: `lib/payments/` + checkout/webhook APIs
* Purchases table + asset tier fields

**Cinematic Reveal — signature UX**

* Fade → Metaprom Infinity logo → fullscreen playback (audio on) → premium offer
* `CinematicReveal.tsx`, `MetapromInfinityLogo.tsx`
* Replaced small embedded preview flow

**Mockups + workflow**

* Checkout (5 states) + Library (4 states) HTML previews
* Design tokens, briefs, approval process
* Official development workflow documented

**Documentation**

* METAPROM_MASTER rewritten — Executive Summary, priorities, philosophy, roles, journey

### Next (superseded June 29, 2026)

1. Apply Supabase migrations
2. CEO approval of Checkout + Library mockups
3. Membership + Landing/Studio mockups
4. End-to-end customer test → Beta

See **Session Summary — June 29, 2026** for current next steps.

---

## Session Summary — June 29, 2026

### Shipped / validated

* **Reliability Sprint** — image generation 20/20; `lib/enhancement.ts`
* **`/experience` canonical** — production-wired via `lib/studio-creation.ts`
* **Infrastructure diagnosis** — billing OK (~MXN 427 prepaid); Veo 10/day quota is Beta blocker for video scale

### Product decisions

* Phase transition: **AI Development → Product Experience** (official)
* **Instant Capture** discovery — high priority pre-Beta
* Roadmap: CEO Review → UX Polish → Instant Capture → Beta

### Next

1. CEO Product Review — `/experience` end-to-end
2. UX Polish
3. Veo capacity plan for Beta (100+ videos/day)
4. Instant Capture (pre-Beta)

*Superseded by **Session Summary — July 1, 2026**.*

---

## Session Summary — July 1, 2026

### Strategic evolution

Metaprom completed the **AI engine** and entered **Product Polish** (Sprint 3.2 — Final Beta Polish). Work now targets UX, commercialization, and Beta readiness — not new AI capabilities.

### Product decisions

| Decision | Detail |
|----------|--------|
| **Canonical journey** | `Landing → Studio` — Studio is the only production experience |
| **Deprecated** | Experience onboarding (`/experience`) |
| **Biblioteca** | Commercial Portfolio inside Studio — not a file browser |
| **Core positioning** | Describe the commercial; Metaprom creates the production |
| **Customer experience** | Provider details never exposed; premium Metaprom failure messaging |
| **Hero** | Artwork approved; CSS/layout art direction to restore phone-centric concept |
| **Next sprint** | Sprint 4 — Payments, then Public Beta |

### Sprint 3.2 remaining (before Payments)

1. Biblioteca refresh reliability
2. Biblioteca navigation polish
3. Hero art direction — *"This commercial came from THIS phone"*
4. Premium rejection messaging

### Long-term positioning

Metaprom is a **commercial creation platform** — not an AI company, not an image enhancement tool.

> You focus on your business. Metaprom creates your commercial.

See **MASTER UPDATE — July 1, 2026** and **Executive Summary (July 1, 2026)**.

---

## Session Summary - June 2026

*Historical context — preserved. Superseded by **Session Summary — June 29, 2026** for current priorities.*

Metaprom is a **marketing content generation platform** for **non-expert** SMBs. Core mission: bring premium advertising creation to people who are not AI experts. Metaprom sells results, not AI. Segmentation: AI experts vs non-experts (not creator vs non-creator). UX principle: **NO BARRIERS. NO NONSENSE.** — Upload → Describe → Generate → Pay → Download → Publish.

### Video validated (June 2026)

Veo 3.1 Lite integrated and validated. Model: `veo-3.1-lite-generate-preview`. Multiple real generations on Metaprom AI paid project. Measured economics: 5s clip = 8.05 MXN (~1.61 MXN/sec). VIDEO PREMIUM concept: 149 MXN (3 proposals, 2 revisions, HD). Competitive advantage = workflow/UX, not model access.

### Strategic pivot (June 2026)

Metaprom repositioned to an AI-Powered Commercial Content Factory — selling ready-to-use assets, not AI tools. Market A (marketplace) is acquisition; Market B (content creation) is the long-term opportunity. Video is a primary product candidate. Beta split into Groups A, B, and C to test willingness to pay across segments.

### Video strategy discovery (June 2026)

Video is a primary product candidate — single AI product video outperformed enhanced images emotionally. Kling-inspired UX: spectacular visuals first, then guided path (not cockpit). Core principle: Metaprom navigates the user — upload → category → one sentence → generate → WOW → buy. Hispanic market: adapt to user mental model. Google Veo provisional leader (investigate first). Preliminary pricing tests: $99–$299+ MXN; example conversion offer: $170 MXN HD unlock. Build complete Video Economics before Video MVP.

### UX philosophy breakthrough (June 2026)

Kling analysis: competitive advantage may be guided UX, not better models. Design like Uber, not aircraft cockpit. Continue sales conversation after free demo (Buy Now + subscription upsell). Remove every obstacle between desire and purchase.

### Infrastructure (June 2026)

Zoho email migration complete. SPF and MX DNS issues resolved. roberto@metaprom.com operational.

### Ownership milestone

Major milestone achieved:

Metaprom AI transitioned from shared project visibility to authenticated user ownership.

Current architecture:

Google OAuth
↓
Supabase Auth
↓
auth.users.id
↓
projects.user_id
↓
Project Ownership
↓
Asset Ownership

Result:

Metaprom AI now understands who owns each project and restricts visibility accordingly.

Next Objective (historical — superseded June 28, 2026):

See **Executive Summary** and **Session Summary — Strategic Transition (June 28, 2026)** for current priorities.

Previous objectives (preserved):

1. Execute and validate RLS for projects and assets (security checkpoint).
2. Integrate validated video into Biblioteca — **completed via Sprint 1**.
3. Guided production UX — **evolved into Cinematic Reveal + commercial MVP**.
4. VIDEO PREMIUM packaging — **shipped Sprint 2** (149 MXN, mock payments).

Post-RLS Priorities (historical — superseded):

1. Security checkpoint (RLS) — still pending migration execution
2. Biblioteca video integration — **shipped**
3. Guided UX / Cinematic Reveal — **shipped**
4. VIDEO PREMIUM + payments — **shipped** (production provider TBD)
5. Visual outcome-first landing — **blocked on mockup**
6. Beta program — **next milestone**
7. Prompt Compliance Assistant — future
8. Acquisition hypotheses (H5, H6) — ongoing research

---

## AI Development Workflow

### Official Product Development Workflow (June 28, 2026)

See **Official Development Workflow** and **Product Review Process**.

```
Idea → Strategic discussion → UX / Product review → Visual Mockups
  → CEO approval → Cursor implementation → UX Review → Iteration
```

Mockups are **implementation specifications**, not presentation material.

### Team roles

| Role | Owner |
|------|-------|
| CEO — vision, business, strategy, approval | Roberto |
| Product design — UX, mockups, commercial experience | ChatGPT |
| CTO — engineering, implementation, architecture | Cursor |

See **Team Roles**.

### Multi-tool execution (preserved)

* **ChatGPT** — strategy, product design, UX, mockups, architecture, commercial experience
* **Cursor** — repository analysis, implementation, debugging, refactoring, technical architecture
* **Codex** — targeted code generation when appropriate

Principle: use the best tool for each stage.

Historical note: Biblioteca implementation demonstrated that repository-aware tools (Cursor) are essential for multi-file diagnosis — code generation alone loses context.

### Git Cleanup Methodology (July 10, 2026)

Git cleanup is now a documented engineering discipline.

Important principles:

* Never mix cleanup with production commits.
* Production commits first.
* Cleanup last.
* Every commit should remain buildable.
* Repository cleanup is operational work, not product work.

Current state:

* Repository is clean.
* Hero branch is synchronized with remote.

### Product Creation Workflow (June 28, 2026 — superseded by Official Workflow above)

Earlier emergent workflow (preserved for history):

```
Vision → Conversation → ChatGPT Mockup → Founder Review
  → Cursor Implementation → Customer Test → Iteration
```

This is now formalized as the **Official Development Workflow** with CEO approval and UX review gates.

---

## Hero V2 Rendering Investigation — Complete (July 8, 2026)

### Hero V2 Status

Hero V2 is **approved for production**.

The original rendering bug has been resolved.

The remaining differences are purely art direction and are no longer considered rendering defects.

The Hero rendering architecture is now under **code freeze**.

Runtime geometry is frozen.

`lib/hero-layout-spec.ts` is frozen.

Hero now enters the **Art Direction** phase. Future work should focus on **asset refinement** rather than rendering changes.

### Root Cause Investigation

The following components were individually verified during the investigation:

* React
* CSS
* Hero layout
* HeroPhoneScreen
* LivingShowcase
* HTML video rendering
* Browser rendering
* Percentage calculations
* LCD geometry

**Result:**

The rendering pipeline is correct.

The original problem was not caused by React, CSS, or browser rendering.

### LCD Geometry

The LCD opening was manually re-measured from the physical phone bezel instead of luminance detection.

The Hero LCD geometry is now considered the **production reference**.

Future geometry changes should only happen if the presenter artwork itself changes.

### HeroPhoneScreen Discoveries

Two independent controls were identified.

**1. LCD Geometry**

Defined in:

`lib/hero-layout-spec.ts`

Controls:

* LCD position
* LCD size
* clipping region

**2. Commercial Framing**

Defined in:

`components/studio/HeroPhoneScreen.tsx`

Important controls discovered:

* `HERO_COMMERCIAL_SCALE_Y`
* `objectPosition="50% calc(50% + 15px)"`

These control different responsibilities.

`scaleY` controls vertical stretching.

`objectPosition` controls visible framing.

Both controls are **optical tuning only**. Future work must not confuse these controls with runtime geometry.

### Investigation Results

Conclusions reached after extensive testing:

* Increasing `HERO_COMMERCIAL_SCALE_Y` works.
* However, after approximately **1.07–1.09** the visible improvement becomes minimal because rendering is ultimately constrained by the fixed LCD clipping region.
* Reducing `objectPosition` below **+15px** consistently worsened the bottom fit.
* The remaining optical difference is therefore not a simple `objectPosition` problem.

### Final Hero Baseline

The current Hero is the **approved production baseline**.

Current Hero objective achieved:

> "This premium commercial came from THIS phone."

Any remaining differences are considered cosmetic art direction.

Final architectural conclusion:

* Hero architecture validated.
* Runtime geometry frozen.
* `lib/hero-layout-spec.ts` frozen.
* `HeroPhoneScreen` controls only optical presentation.
* `HERO_COMMERCIAL_SCALE_Y` and `objectPosition` are optical tuning only.
* Future Hero perfection should be done by editing `hero-presenter` artwork, not runtime hacks.

### Future Hero V3

#### Future Improvements

If pixel-perfect LCD alignment is ever required, the preferred solution is **NOT** additional rendering logic.

Instead:

* Modify `hero-presenter-v4.png`.
* Adjust only the illustrated LCD opening so that it perfectly matches the HTML overlay.

**PNG refinement is preferred over additional runtime rendering complexity.**

### Engineering Lessons

#### Lessons Learned

The biggest engineering lesson from this investigation:

**Previous workflow:**

```
Large prompts
↓
Many simultaneous constraints
↓
Cursor searched the entire project
↓
Very slow iterations
```

**New workflow:**

```
Identify the exact parameter responsible for the behavior
↓
Modify ONLY that parameter
↓
Freeze everything else
```

**Concrete example:**

Instead of repeatedly asking:

> "Make the Hero look better"

the investigation eventually isolated:

* `HERO_COMMERCIAL_SCALE_Y`
* and later `objectPosition`

which reduced iteration time dramatically.

This methodology should be preferred for all future Product Experience work.

#### Workflow Lesson

Once a subsystem becomes stable:

1. Stop describing behavior.
2. Locate the parameter controlling that behavior.
3. Iterate **ONLY** on that parameter.
4. Freeze everything else.

This investigation demonstrated a dramatic reduction in Cursor iteration time once only a single parameter was being modified.

Core engineering lesson:

> Always identify the parameter before describing the behavior.

### Sprint 3.2 Closure

Then-current project status (July 10, 2026):

1. Hero V2 production baseline approved.
2. Hero branch pushed successfully.
3. Runtime architecture stable.
4. Rendering investigation complete.
5. Sprint 3.2 officially closed.

---

**Current operating handoff:** see **NEXT SESSION START HERE** at the top of this document (September 2, 2026 session close). Production baseline: `655dcc1`. Google Handoff and anonymous generation → Preview are personally production-validated. Universal email auth is P0. Anonymous Share is OFF (`bdfc489` rolled back). Premium Delivery dedicated surface acceptance pending. August 18–20, 2026 GTM records remain historical context. Do **not** implement Storyboard, Preview Pro, Motion Preview, refunds, duration/trim, or Preview prompts from August 19 records. Do not restore `bdfc489`. Do not restart from Sprint 3.2, Dual Creation as the next BUILD sprint, or Stripe Test Mode.
