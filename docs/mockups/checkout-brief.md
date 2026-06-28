# Checkout — UX Brief

**Status:** Mockup ready — pending product review

**Preview:** [checkout.html](./previews/checkout.html) · [checkout-default.png](./approvals/checkout-default.png)

## User goal

Buy HD commercial in one screen, without leaving Studio.

## Layout (approved mockup)

- Video preview (teaser with watermark visible).
- Headline: **Tu comercial HD está listo**
- Price: **$149 MXN** (from pricing config).
- Payment method chips: Tarjeta · OXXO · (future methods).
- Primary CTA: **Comprar ahora**
- Trust line: *Pago seguro · Descarga inmediata*

## States (all mocked in HTML)

| State | Frame name | Key copy |
|-------|------------|----------|
| Default | Checkout / Default | Tarjeta selected, Comprar ahora |
| OXXO select | Checkout / OXXO | Generar referencia OXXO |
| OXXO pending | Checkout / OXXO Pending | Referencia + Esperando confirmación |
| Processing | Checkout / Processing | Produciendo tu comercial HD |
| Success | Checkout / Success | ¡Listo! + Descargar comercial HD |

## Post-purchase

- Progress: *Produciendo tu comercial HD…*
- Success: *¡Listo!* + download button (no watermark).

## Design reference

See [design-tokens.md](./design-tokens.md) for Figma values.

## Approval

- [x] Mockup created
- [ ] Product review
- [ ] Approved for implementation
