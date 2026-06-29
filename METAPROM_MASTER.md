# METAPROM MASTER

## MASTER UPDATE — June 29, 2026

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

**Product decision:** Do not build isolated screen mockups anymore.

Build **one interactive product surface** — **Metaprom Experience v1** at `/experience` — that defines the complete customer journey. Landing and Studio are visually one product: dark, minimal, elegant, cinematic.

**June 29 update:** `/experience` is the **canonical commercial journey**, wired to production APIs via shared services — not a simulation.

This remains the **master specification** for the commercial MVP. Future implementations must follow it, not individual static mockups.

See `docs/experience-v1.md`.

---

## Executive Summary (June 29, 2026)

**Metaprom has officially transitioned from building an AI engine to building a world-class commercial product experience.**

The AI generation stack — commercial image transformation and cinematic video via Veo 3.1 Lite — is **mature enough for Beta**. First real customer WOW was validated on June 28, 2026. The product hypothesis is confirmed: customers buy the feeling of seeing their own product transformed into professional marketing, not AI.

**The primary bottleneck is no longer generation quality or image reliability.** It is UX, commercial flow, customer conversion, and **Veo daily quota capacity** for video at Beta scale.

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

---

## Project Vision

Metaprom is a commercial content platform focused on creating professional advertising assets for ecommerce sellers, restaurants, real estate, and SMBs — not merely improving product photos.

The long-term vision is the simplest way for businesses to manufacture professional commercial advertising content: images, social creatives, and video.

Core philosophy:

> Customers do not want AI. Customers want content that helps them sell.

Core mission:

> Bring premium advertising creation to people who are not AI experts.

Metaprom sells marketing results, not AI. Customers should never need to understand AI models, prompts, tokens, APIs, Veo, or Gemini.

Platform scope:

* Commercial image generation
* Cinematic video generation
* Automatic marketing asset library
* Premium commercial purchase and download

Historical scope (preserved): photo enhancement, marketplace optimization — now acquisition channels, not the product center.

See **Strategic Pivot – Metaprom AI Evolution (June 2026)**, **Milestone — First Real Commercial Generated (June 28, 2026)**, **Video Generation — Validated (June 2026)**, and **Session Summary — Strategic Transition (June 28, 2026)**.

---

## Product Completion Roadmap (June 2026)

### Strategic direction

**Metaprom is no longer AI-first. Metaprom is Product Experience First.**

The AI engine is considered mature enough for Beta. The primary bottleneck is UX, commercial flow, and customer conversion.

Objective:

> Complete the commercial flow as one continuous premium experience.

Success metric:

> Customers say: *"WOW… I want this commercial."*

### Current priorities (official — June 29, 2026)

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

* The customer buys **results**, not AI.
* Never expose prompts, models, or technical concepts.
* AI adapts to the customer; the customer never adapts to AI.
* Every screen must reduce friction.
* **Product Experience First.**
* **The WOW stays inside Metaprom** (see **Cinematic Reveal**).
* Uploaded photo always takes precedence.
* Saving is automatic — the customer never manages files.
* Library is automatic — every creation appears without user action.
* Checkout sells the **commercial**, not the payment.
* Important screens require **approved mockups before implementation** (see **Product Review Process**).

### Commercial tiers

**Free (customer acquisition — teaser)**

* 3–5 second teaser video
* Metaprom watermark
* Medium quality
* Delivered via **Cinematic Reveal** — creates trust and WOW, not the full deliverable

**Premium (paid)**

* 10–15 second HD commercial
* No watermark
* Marketing-ready download
* Unlocked after checkout inside Studio

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

---

## Continuity Context (June 2026)

*Handoff summary — consolidates current state, recent discoveries, and immediate next objective.*

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

The biggest lesson was **experiential**, not technical. Metaprom is no longer an image enhancement platform — it is becoming an **AI Creative Studio**. The customer should feel they are working with a creative director, not operating software.

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

**Complete the commercial MVP and prepare for Beta** — not more AI experimentation.

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

The product is no longer an image enhancement platform. Metaprom is becoming an **AI Creative Studio**.

The customer should feel they are working with a creative director, not operating software.

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

See **UX Philosophy — Kling Analysis Breakthrough (June 2026)**.

---

## Video Generation — Validated (June 2026)

**STATUS: VALIDATED**

Video generation is no longer a future roadmap item. It is a **working capability**.

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

See **UX Philosophy**, **NO BARRIERS. NO NONSENSE.**, and **H2 - Video as Primary Product**.

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

---

## Ad-Supported Future Model (Future Exploration)

**STATUS: Not MVP. Future strategic option.**

Potential concept: **sponsored generations** — users receive free generations funded by advertisers.

Requires separate economics, compliance, and UX design. Document for long-term exploration only.

---

## Core Principles

1. Adoption before monetization.
2. Focus on solving real business problems.
3. Continuously evaluate tools that dramatically increase productivity.
4. Preserve project knowledge inside the repository.
5. Build globally. Launch pragmatically.
6. Simplicity is a competitive advantage.

---

## Product Philosophy

See also: **NO BARRIERS. NO NONSENSE.**, **UX Discoveries (June 28, 2026)**, **Cinematic Reveal**, and **Target Customer (June 2026 Update)**.

### Core principles (June 28, 2026 — official)

* The customer buys **results**, not AI.
* Never expose prompts, models, or technical concepts.
* AI adapts to the customer; the customer never adapts to AI.
* Every screen must reduce friction.
* **Product Experience First.**
* **The WOW stays inside Metaprom.**

### Supporting principles (preserved)

* The user should not navigate Metaprom — Metaprom navigates the user.
* Design like Uber, not an aircraft cockpit.
* Users choose outcomes, not AI settings.
* Uploaded photo is the strongest signal of intent.
* Saving is invisible — automatic.
* Library is automatic — no file management.
* Checkout sells the commercial, not the payment.
* Simplicity is a competitive advantage.

Principle:

> Users care about outcomes more than AI.

The customer is not purchasing AI. The customer is purchasing:

* Better product presentation
* Better advertising assets
* Increased perceived professionalism
* The emotional peak of seeing their product as a real commercial

Metaprom sells **transformation**, not AI. AI is the enabling technology, not the product.

### Studio Principles (June 28, 2026)

See **Milestone — First Real Commercial Generated (June 28, 2026)** and **Cinematic Reveal**.

* The uploaded photo is the strongest signal of intent.
* Intent classification enriches the experience but never blocks creation.
* Saving is invisible — the customer never loses work.
* The customer should never adapt to the AI; the AI adapts to the customer.
* The objective is believable commercials, not animated photos.
* Commercial Image → Commercial Video: the generated image is the visual foundation for the commercial.
* The WOW moment happens inside Metaprom via **Cinematic Reveal** — before the purchase decision.

Customers care far more about business outcomes than about the underlying AI technology.

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

Structured view of product progress (June 2026). **Product Experience First** — see **Executive Summary** and **Product Completion Roadmap (June 2026)**.

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

### Current priorities (official — June 29, 2026)

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

### Product Creation Workflow (June 28, 2026 — superseded by Official Workflow above)

Earlier emergent workflow (preserved for history):

```
Vision → Conversation → ChatGPT Mockup → Founder Review
  → Cursor Implementation → Customer Test → Iteration
```

This is now formalized as the **Official Development Workflow** with CEO approval and UX review gates.

---
