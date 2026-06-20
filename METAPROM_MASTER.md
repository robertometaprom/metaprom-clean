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

Additional Principle:

Metaprom should sell transformation, not AI.

Users should primarily experience:

* Better images
* Better videos
* Better marketing assets
* Better business presentation

AI is the enabling technology, not the product.

Implications:

* Marketing should emphasize outcomes.
* Marketing should emphasize before/after transformation.
* Technical AI terminology should remain secondary whenever possible.
* Users should not need AI expertise to obtain value.

Observation:

Customers care far more about business outcomes than about the underlying AI technology.

---

## Strategic Positioning

### June 2026

Observation:

Metaprom is increasingly positioned as a business transformation platform rather than an AI platform.

Customers are expected to respond primarily to:

* Better product presentation
* Better marketing materials
* Better visual assets
* Increased professionalism

rather than to AI itself.

Working Principle:

The customer buys the transformation.

AI is simply the mechanism that delivers it.

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
* Google OAuth authentication flow
* Login, callback and sign-out routes
* Supabase SSR session architecture
* Ownership layer (projects.user_id)
* Application-level project isolation
* RLS migration preparation

Pending

* Row Level Security (RLS) activation
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

## Session Summary - June 2026

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

Next Objective:

Execute and validate RLS for projects and assets.

Post-RLS Priorities:

1. Security checkpoint completion.
2. Video workflow implementation.
3. Beta acquisition (20 active users target).
4. Validation of acquisition hypotheses (H5 and H6).

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
