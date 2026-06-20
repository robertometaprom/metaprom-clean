# METAPROM MASTER

## Project Vision

Metaprom is an AI-powered platform focused on creating, enhancing and managing advertising assets for ecommerce sellers and brands.

The long-term vision is to provide the simplest and most accessible way for sellers to transform product photos into professional commercial content.

The platform is designed to evolve beyond images into video, marketplace assets and future content workflows.

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

Principle:

Users choose outcomes, not AI settings.

Implications:

* Users should select business goals and destinations.
* Metaprom should hide unnecessary AI complexity.
* Marketplace and platform workflows should be pre-configured whenever possible.
* Simplicity is a competitive advantage.

Examples:

Instead of asking users for prompts, models, aspect ratios or technical parameters, Metaprom should ask:

* Where will this be published?
* What are you trying to sell?
* What result do you want?

Additional Principle:

Users care about outcomes more than AI.

Implications:

* Visual transformation is more important than AI terminology.
* Business value should be emphasized over technical implementation.
* Users should see improved results, not AI complexity.
* AI should remain largely invisible whenever possible.

Observation:

The customer is not purchasing AI.

The customer is purchasing:

* Better product presentation
* Better advertising assets
* Increased perceived professionalism
* Faster content creation

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

Current focus:

* Ecommerce sellers
* Marketplace-ready content
* Product photography enhancement
* Video generation workflows

---

## Current Product Status

Completed

* OpenAI integration
* Image enhancement workflow
* Biblioteca module
* Project creation
* Asset storage
* Asset preview
* Supabase integration
* Google OAuth authentication flow (validated end-to-end)
* Google user creation verified in Supabase Auth
* Login, callback and sign-out routes (tested)
* Supabase SSR session architecture (validated)

Pending

* User ownership (projects.user_id)
* Row Level Security (RLS) policies
* Asset deletion
* Project deletion
* Video generation workflow
* Marketplace-specific exports

---

## Current Architecture

Frontend

* Next.js

Database

* Supabase

AI

* OpenAI

Authentication

* Supabase Auth
* Google OAuth (primary sign-in method)
* Supabase SSR (session architecture)

Development Environment

* Cursor (primary IDE and repository intelligence)
* GitHub
* ChatGPT (strategy, product and architecture)
* Codex (targeted code generation)

See **AI Development Workflow** for the multi-tool development approach.

See **Authentication Architecture** for ownership and security model.

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
* Ownership (user_id) and RLS still pending.

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

### H2 - Video as Primary Monetization

Demand for commercial video content is already proven.

Metaprom may monetize primarily through video generation and other high-value services rather than basic image enhancement.

Rationale:

* Videos have significantly higher perceived business value.
* Video generation may support premium pricing, pay-per-use pricing, or marketplace-specific offerings.
* Images and video are complementary rather than competing features.

Relationship to H1:

Image enhancement is primarily an acquisition channel.

Video generation is currently considered the most likely monetization engine.

Status:
Hypothesis not yet validated.

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
Unvalidated hypothesis.

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

* Ownership (user_id)
* Row Level Security (RLS)

---

## AI Development Workflow

### June 2026

Observation:

Different AI tools excel at different stages of development.

Lessons Learned:

* ChatGPT is primarily used for strategy, product design, business modeling, architecture discussions and project planning.
* Cursor is the primary development environment and repository intelligence tool.
* Cursor is considered essential for understanding, modifying and maintaining the Metaprom codebase.
* Codex can accelerate code generation but may lose context on larger multi-file implementations.
* Biblioteca implementation demonstrated the importance of repository-aware AI tools. Cursor successfully diagnosed and resolved issues that were difficult to solve through code generation alone.

Decision:

Metaprom development will use a multi-tool AI workflow.

Current workflow:

* ChatGPT → strategy, architecture, product and business decisions.
* Cursor → repository analysis, implementation, debugging and code modifications.
* Codex → targeted code generation when appropriate.

Principle:

Use the best tool for each stage of development rather than relying on a single AI system.

Summary:

* ChatGPT is strongest for strategy, architecture and business decisions.
* Cursor is strongest for repository-wide understanding and implementation.
* Different AI tools should be used according to their strengths.
