# Metaprom Experience v1

**Status:** Active — master specification for commercial MVP  
**Route:** `/experience`  
**Date:** June 28, 2026

## Product decision

Metaprom no longer builds isolated screen mockups for major UX decisions.

Instead, **one interactive prototype** simulates the complete customer journey. This prototype is the **master specification** — future implementations must follow it, not individual static mockups.

## Design language

- **Dark.** Black surfaces, `#F5F5F0` text.
- **Minimal.** One action per screen. No cockpit complexity.
- **Elegant.** Cinematic transitions, fade reveals, premium typography.
- **Continuous.** Landing and Studio are one product — no context switch.

## Complete journey

```
Landing
  ↓
Upload
  ↓
Intent
  ↓
Generate
  ↓
Google Login (only when project needs to be saved)
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

Every screen connects naturally to the next. Think in **one continuous experience**, not pages.

## Implementation map

| Step | Component | Notes |
|------|-----------|-------|
| Landing | `ExperienceFlow` — landing section | Full-bleed showcase video, same copy as marketing site |
| Upload | `ExperienceFlow` — upload step | Photo required to continue |
| Intent | `ExperienceFlow` — intent step | One sentence, suggestion chips |
| Generate | `ExperienceFlow` — generate step | Review photo + intent, trigger creation |
| Login | `ExperienceFlow` — login step | Google OAuth; demo skip for CEO walkthrough |
| Generating | `ExperienceFlow` — generating step | Progress animation, simulated output |
| Cinematic Reveal | `CinematicReveal.tsx` | Fade → Infinity logo → premiere → offer |
| Premium Offer | `CinematicReveal.tsx` — offer stage | Unlock CTA → checkout |
| Checkout | `ExperienceFlow` — checkout step | Card / OXXO, mock payment in prototype |
| Library | `ExperienceFlow` — library step | Project view with assets |
| Download Center | `ExperienceFlow` — download step | Tier badges, download actions |
| Create Another | `ExperienceFlow` — create-another step | Reset to upload |

## Files

```
app/experience/page.tsx
components/experience/ExperienceFlow.tsx
components/experience/ExperienceShell.tsx
components/experience/ExperienceUI.tsx
lib/experience/types.ts
```

## Prototype vs production

| Behavior | Prototype (`/experience`) | Production MVP |
|----------|---------------------------|----------------|
| Generation | Simulated with showcase assets | Real `/api/enhancement` + `/api/video` |
| Checkout | Instant mock success | `/api/payments/checkout` |
| Library | In-session state | Supabase Biblioteca |
| Login timing | Before generation (save gate) | Same — auth only when saving |
| Landing | Inline first step | Same surface, no separate marketing page split |

## Approval workflow (updated)

```
Strategic discussion
  ↓
Metaprom Experience v1 (interactive prototype)
  ↓
CEO approval
  ↓
Cursor implementation (match prototype)
  ↓
UX review → iteration
```

Static HTML mockups in `docs/mockups/previews/` remain as reference for individual components (checkout states, library panel) but **Experience v1 supersedes them** as the journey specification.

## CEO walkthrough

1. Open `/experience`
2. Click **Crear el mío** on landing
3. Upload any product photo
4. Enter intent (or use a chip)
5. Confirm on Generate
6. Sign in with Google **or** "Continuar en demo sin guardar"
7. Watch generating → Cinematic Reveal → Premium Offer
8. Checkout → Library → Download Center → Create Another

Total time: ~3 minutes with simulated generation.
