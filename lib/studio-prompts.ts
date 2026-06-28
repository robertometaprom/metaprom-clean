import type { Mode } from "./prompts";

const DEFAULT_COMMERCIAL_VISION =
  "Create a compelling luxury product advertisement that makes the customer want to buy immediately.";

/**
 * Builds the image prompt for Studio — commercial transformation, not photo cleanup.
 */
export function buildStudioImagePrompt(
  customerIntent: string,
  mode: Mode,
): string {
  const vision = customerIntent.trim() || DEFAULT_COMMERCIAL_VISION;

  const modeHint =
    mode === "amazon" || mode === "mercado-libre"
      ? "The result should also work as a high-converting marketplace hero image."
      : mode === "social"
        ? "Optimize for scroll-stopping social media impact."
        : mode === "custom"
          ? "Follow the customer's creative direction as the primary goal."
          : "Optimize for a premium brand campaign look.";

  return `Goal: Transform this cellphone product photo into a professional advertising image.

This is NOT a photo enhancement task. The customer uploaded a casual phone photo and expects a real commercial — the kind they would see in a magazine, Instagram ad, or TV campaign.

Creative direction from the customer:
${vision}

Requirements:
- Create a dramatic, aspirational advertising scene around the product
- Professional commercial lighting, depth, and composition
- Campaign-ready, magazine-quality presentation
- The result must look like a professional advertisement — NOT a slightly improved version of the same photo
- Do NOT simply crop, brighten, remove background, or place the product on a plain white background
- Build an environment, mood, and story that sells the product
- Preserve exact product identity (shape, colors, branding, labels, proportions)
- ${modeHint}

The customer should immediately think: "Wow... this looks like a professional advertisement."`;
}

/**
 * Builds the video prompt for Studio — scene-based commercial, not photo animation.
 */
export function buildStudioVideoPrompt(customerIntent: string): string {
  const vision = customerIntent.trim();

  const sceneBlock = vision
    ? `Scene to create:\n${vision}\n\nThe product from the reference image must appear naturally in this scene — worn, held, displayed, or used as appropriate.`
    : `Scene to create:\nA cinematic commercial showcasing the product in an aspirational real-world setting with human interaction or dynamic product use. The product from the reference image must be the hero of the scene.`;

  return `Create a 5-second professional social media / TV commercial. This is NOT photo animation.

${sceneBlock}

Requirements:
- Real advertising quality — like a commercial produced for Instagram, TikTok, or television
- Show believable human action, environment, and context when appropriate
- Cinematic camera movement (tracking shots, dolly, orbit — not a static zoom on a photo)
- Professional lighting, depth of field, and color grading
- The product must be clearly visible and recognizable throughout
- Create a living scene with motion, atmosphere, and story

Strictly avoid:
- Ken Burns effect on a static image
- Simply animating or parallaxing the uploaded photo
- Slideshow-style motion or subtle photo wobble
- Product floating on a plain background with no scene`;
}
