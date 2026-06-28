# Metaprom UI — Design Tokens (Figma-ready)

Use these values when building frames in Figma. Source: Studio (`/studio`).

## Color

| Token | Hex | Usage |
|-------|-----|--------|
| `surface/page` | `#ECECEC` | Page background |
| `surface/card` | `#FFFFFF` | Cards, panels |
| `surface/muted` | `#FAFAFA` | Secondary surfaces |
| `border/default` | `#E5E5E5` | Card borders |
| `border/subtle` | `#F5F5F5` | Dividers |
| `text/primary` | `#171717` | Headlines |
| `text/secondary` | `#737373` | Body, captions |
| `text/tertiary` | `#A3A3A3` | Placeholders |
| `brand/violet-600` | `#7C3AED` | Price, accents |
| `brand/violet-500` | `#8B5CF6` | Gradients |
| `brand/purple-600` | `#9333EA` | Gradient end |
| `brand/violet-50` | `#F5F3FF` | Selected chips, badges |
| `brand/violet-200` | `#DDD6FE` | Badge borders |
| `overlay/scrim` | `#000000` @ 30% | Library backdrop |
| `watermark/bg` | `#000000` @ 50% | Video watermark pill |

## Typography (Geist / system-ui)

| Style | Size | Weight | Line height | Use |
|-------|------|--------|-------------|-----|
| `display/lg` | 30px | 700 | 1.2 | Checkout headline |
| `display/md` | 24px | 700 | 1.25 | Panel titles |
| `price` | 30px | 700 | 1 | MXN price |
| `body/md` | 16px | 400 | 1.5 | Descriptions |
| `body/sm` | 14px | 400 | 1.5 | Subtitles |
| `label/sm` | 12px | 600 | 1.3 | Badges, captions |
| `button/md` | 14px | 600 | 1 | CTAs |

## Radius

| Token | Value |
|-------|-------|
| `radius/xl` | 16px |
| `radius/2xl` | 20px |
| `radius/3xl` | 24px |
| `radius/full` | 9999px |

## Spacing scale

4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48

## Shadows

| Token | CSS |
|-------|-----|
| `shadow/card` | `0 20px 60px rgba(0,0,0,0.08)` |
| `shadow/panel` | `0 25px 50px rgba(0,0,0,0.15)` |

## Frame sizes (Figma)

| Screen | Width × Height |
|--------|----------------|
| Mobile checkout | 390 × 844 |
| Library panel | 420 × 844 (slide-over) |
| Studio context | 1440 × 900 (library overlay) |

## Components

### Primary button
- Fill `#171717`, text white, radius 16px, padding 12px 20px, hover `#262626`

### Secondary button
- Border `#E5E5E5`, fill `#FAFAFA`, text `#262626`

### Payment chip (selected)
- Border `#8B5CF6`, fill `#F5F3FF`, text `#5B21B6`

### Payment chip (default)
- Border `#E5E5E5`, fill white, text `#404040`

### Video frame
- Aspect 9:16, radius 16px, border `#E5E5E5`

### Watermark pill
- Text `METAPROM`, 12px semibold, tracking 0.15em, white @ 85%, bg black @ 50%, blur backdrop
