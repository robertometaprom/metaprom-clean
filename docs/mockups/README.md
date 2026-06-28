# Metaprom Mockup-First Development

No important screen is coded before its UX has been reviewed and approved.

## Workflow

1. **Brief** — Add or update a brief in this folder (`*-brief.md`).
2. **Visual** — Produce Figma or static mockups; export approvals to `approvals/`.
3. **Review** — Product owner marks brief as **Approved** in the brief file.
4. **Build** — Implementation PR must reference the approved mockup.
5. **Verify** — Ship only when UI matches the approved mockup.

## Status

| Screen | Brief | Mockup | Approved | Implemented |
|--------|-------|--------|----------|-------------|
| Library (redesign) | [library-brief.md](./library-brief.md) | [HTML](./previews/library.html) · [PNG](./approvals/library-panel.png) | Pending review | No |
| Checkout | [checkout-brief.md](./checkout-brief.md) | [HTML](./previews/checkout.html) · [PNG](./approvals/checkout-default.png) | Pending review | No |
| Membership dashboard | [membership-brief.md](./membership-brief.md) | Pending | No | No |
| Landing + Studio unified | [landing-studio-brief.md](./landing-studio-brief.md) | Pending | No | No (post–Sprint 2) |
| Download center | [download-center-brief.md](./download-center-brief.md) | Pending | No | No |

## Sprint exceptions

Backend work (Storage, payments API, tier logic) does not require mockups.

Existing Studio purchase phase may receive **minimal functional wiring** only until checkout mockups are approved.
