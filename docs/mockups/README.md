# Metaprom Product Development

## Metaprom Experience v1 (June 28, 2026)

**Isolated screen mockups are deprecated** for major UX decisions.

Build and iterate on **one interactive prototype** — [Metaprom Experience v1](../experience-v1.md) at `/experience` — that simulates the complete customer journey. This prototype is the **master specification** for the commercial MVP.

Static briefs and HTML previews in this folder remain useful as component references, but the continuous experience prototype takes precedence for journey design.

## Legacy mockup workflow

1. **Brief** — Add or update a brief in this folder (`*-brief.md`).
2. **Visual** — Produce Figma or static mockups; export approvals to `approvals/`.
3. **Review** — Product owner marks brief as **Approved** in the brief file.
4. **Build** — Implementation PR must reference the approved mockup.
5. **Verify** — Ship only when UI matches the approved mockup.

## Status

| Screen | Brief | Mockup | Approved | Implemented |
|--------|-------|--------|----------|-------------|
| **Experience v1 (full journey)** | [experience-v1.md](../experience-v1.md) | `/experience` interactive | Active prototype | Yes (prototype) |
| Library (redesign) | [library-brief.md](./library-brief.md) | [HTML](./previews/library.html) · [PNG](./approvals/library-panel.png) | Pending review | No |
| Checkout | [checkout-brief.md](./checkout-brief.md) | [HTML](./previews/checkout.html) · [PNG](./approvals/checkout-default.png) | Pending review | No |
| Membership dashboard | [membership-brief.md](./membership-brief.md) | Pending | No | No |
| Landing + Studio unified | [landing-studio-brief.md](./landing-studio-brief.md) | [Experience v1](../experience-v1.md) at `/experience` | Active prototype | Yes (prototype) |
| Download center | [download-center-brief.md](./download-center-brief.md) | Pending | No | No |

## Sprint exceptions

Backend work (Storage, payments API, tier logic) does not require mockups.

Existing Studio purchase phase may receive **minimal functional wiring** only until checkout mockups are approved.
