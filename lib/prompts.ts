export type Mode =
  | "amazon"
  | "mercado-libre"
  | "premium"
  | "social"
  | "custom"
  | "enhancement";

export const PROMPTS: Record<Mode, string> = {
  amazon: `Goal: Create a marketplace-ready Amazon listing image.

Requirements:
- Pure white background
- Product centered
- Professional catalog appearance
- Preserve exact product identity
- Preserve branding
- Preserve labels
- Preserve colors
- Preserve proportions
- Do not invent features
- Default output should be a clean ecommerce-ready product image with a pure white background suitable for online selling.`,

  "mercado-libre": `Goal: Create a marketplace-ready ecommerce image.

Requirements:
- Pure white background
- Product centered
- Strong visibility
- Mobile-friendly presentation
- Preserve exact product identity
- Preserve branding
- Preserve labels
- Preserve colors
- Default output should be a clean ecommerce-ready product image with a pure white background suitable for online selling.`,

  premium: `Goal: Create premium product photography.

Requirements:
- Pure white background
- Premium lighting
- High-end presentation
- Ecommerce-ready appearance
- Preserve exact product identity
- Default output should be a clean ecommerce-ready product image with a pure white background suitable for online selling.`,

  social: `Goal: Create social-media-ready product photography.

Requirements:
- Pure white background
- Strong visual impact
- Marketing-oriented presentation
- Preserve exact product identity
- Default output should be a clean ecommerce-ready product image with a pure white background suitable for online selling.`,

  custom: `Goal: Follow user instructions as closely as possible.

Requirements:
- Preserve exact product identity
- Allow custom backgrounds
- Allow lifestyle scenes
- Allow advertising concepts
- Allow seasonal campaigns
- Allow 3D concepts
- Allow creative compositions
- Follow user instructions as closely as possible
- The default output may include alternative environments, scenes, backgrounds, and creative concepts when requested.`,

  enhancement: `Goal: Professionally enhance the supplied photograph while preserving reality.

THIS IS A PHOTOGRAPHIC ENHANCEMENT TASK.

Requirements:
- Preserve the physical reality represented in the original photograph
- Improve light, color, exposure, perspective, clarity, and professional presentation
- Do not redesign or materially change the subject/property
- Do not invent advertising scenes, props, environments, or storytelling elements
- For real estate: preserve architecture, room dimensions, windows, floors, fixtures, and actual view
- Default output should look like an excellent professional photograph of the same subject`,
};


export function buildPrompt(mode: Mode, aiInstructions?: string) {
  const base = PROMPTS[mode] ?? PROMPTS.amazon;
  if (aiInstructions && aiInstructions.trim().length > 0) {
    return `${base}\n\nAdditional User Instructions:\n${aiInstructions.trim()}`;
  }
  return base;
}
