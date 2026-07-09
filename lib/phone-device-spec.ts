/**
 * Metaprom phone mockup — portrait 9:16 screen is the master reference.
 * All geometry is measured from the screen opening outward.
 * Video fills the screen; it never defines or resizes the phone.
 */

export const BEZEL_LEFT = 14;
export const BEZEL_RIGHT = 14;
export const BEZEL_TOP = 38;
export const BEZEL_BOTTOM = 16;

/** Fixed portrait screen opening — 9:16 */
export const SCREEN_WIDTH = 288;
export const SCREEN_HEIGHT = 512;

export const SCREEN_X = BEZEL_LEFT;
export const SCREEN_Y = BEZEL_TOP;

export const PHONE_WIDTH = BEZEL_LEFT + SCREEN_WIDTH + BEZEL_RIGHT;
export const PHONE_HEIGHT = BEZEL_TOP + SCREEN_HEIGHT + BEZEL_BOTTOM;

export const PHONE_OUTER_RADIUS = 42;
export const SCREEN_RADIUS = 32;
export const PHONE_FRAME_BORDER = 3;

export const DYNAMIC_ISLAND_WIDTH = 88;
export const DYNAMIC_ISLAND_HEIGHT = 24;
export const DYNAMIC_ISLAND_TOP = 12;

export function phonePct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

export const COMMERCIAL_VIDEO_SRC = "/showcase/restaurant/commercial.mp4";
