# Cinematic Reveal — UX Brief

**Status:** Implemented in Studio — reference for future video surfaces

**Internal name:** Cinematic Reveal

## Principle

The WOW moment must happen **inside** Metaprom, not after downloading the file.

## Sequence

1. **Fade to black** (~500ms)
2. **Metaprom Infinity logo** (~1s)
3. **Fullscreen playback** — audio on, no controls initially, object-contain on black
4. **Premium offer** — after video ends

## Premium offer copy

- Headline: *¿Quieres verlo sin límites?*
- CTA: **Desbloquea el comercial completo**
- Price from `lib/pricing.ts`

## Browser audio

Autoplay with sound may be blocked. Fallback: *Toca para activar el audio* (minimal, disappears after tap).

## Approval

- [x] Product principle documented
- [x] Studio implementation
- [ ] Premium re-reveal after HD purchase (future)
