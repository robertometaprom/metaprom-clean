# Library — UX Brief

**Status:** Mockup ready — pending product review

**Preview:** [library.html](./previews/library.html) · [library-panel.png](./approvals/library-panel.png)

## User goal

See everything they have created without managing files. Tap to preview or download.

## Layout (approved mockup)

- Slide-over panel from Studio (420px wide).
- Chronological feed grouped by auto-named project.
- Each card: original thumbnail → enhanced image → teaser video strip (9:16).
- Badges: *Avance gratis* · *HD comprado* or *HD disponible en Studio* (locked).
- Actions: Imagen · Video · HD (or Comprar HD when locked).

## Copy (Spanish)

- Title: **Mi biblioteca**
- Subtitle: *Todo lo que has creado se guarda aquí automáticamente.*

## States (all mocked in HTML)

| State | Frame name | Notes |
|-------|------------|-------|
| Content (desktop) | Library / Desktop overlay | Scrim + panel over Studio |
| Content (mobile) | Library / Mobile | HD locked variant |
| Empty | Library / Empty | Gentle create prompt |
| Loading | Library / Loading | Skeleton cards |

## Design reference

See [design-tokens.md](./design-tokens.md) for Figma values.

## Approval

- [x] Mockup created
- [ ] Product review
- [ ] Approved for implementation
