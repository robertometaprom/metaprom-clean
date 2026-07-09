/**
 * Hero phone screen opening — measured from hero-presenter-v4.png (July 2026).
 *
 * Reference artwork: public/studio/hero-presenter-v4.png (1197×1315).
 * Coordinates are percentages of the presenter image layout box (1197×1315).
 *
 * The live video rectangle (HERO_SCREEN) is the master reference.
 * The approved presenter PNG provides the phone frame — do not overlay a second
 * HTML phone on the hero; use HeroPhoneScreen only.
 *
 * HERO_PHONE_* values derive phone-device-spec geometry for future surfaces —
 * not rendered on the hero presenter artwork.
 */

import {
  BEZEL_LEFT,
  BEZEL_TOP,
  PHONE_HEIGHT,
  PHONE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "@/lib/phone-device-spec";

export const HERO_PRESENTER_REF_WIDTH = 1197;

export const HERO_PRESENTER_REF_HEIGHT = 1315;

/** Horizontal scale of the full presenter artwork (phone bezel + presenter). */
export const HERO_PRESENTER_BASE_SCALE_X = 1.2;

/** Inner screen opening (px on reference artwork) — video master reference */
export const HERO_SCREEN_LEFT = 704;

export const HERO_SCREEN_TOP = 231;

export const HERO_SCREEN_WIDTH = 371;

export const HERO_SCREEN_HEIGHT = 744;

export const HERO_SCREEN_RADIUS = 20;

/** Horizontal offset for hero phone screen content ([data-phone-screen] > div). */
export const HERO_PHONE_CONTENT_OFFSET_X = 0;

/** Fine-tune HTML phone frame on non-presenter surfaces only */
export const HERO_PHONE_OFFSET_X = 0;

export const HERO_PHONE_OFFSET_Y = 0;

export const HERO_PHONE_SCALE = 1;

const scaleX = HERO_SCREEN_WIDTH / SCREEN_WIDTH;

const scaleY = HERO_SCREEN_HEIGHT / SCREEN_HEIGHT;

export const HERO_PHONE_LEFT =
  HERO_SCREEN_LEFT - BEZEL_LEFT * scaleX + HERO_PHONE_OFFSET_X;

export const HERO_PHONE_TOP =
  HERO_SCREEN_TOP - BEZEL_TOP * scaleY + HERO_PHONE_OFFSET_Y;

export const HERO_PHONE_WIDTH = PHONE_WIDTH * scaleX * HERO_PHONE_SCALE;

export const HERO_PHONE_HEIGHT = PHONE_HEIGHT * scaleY * HERO_PHONE_SCALE;

export const HERO_SCREEN = {
  leftPct: `${(HERO_SCREEN_LEFT / HERO_PRESENTER_REF_WIDTH) * 100}%`,
  topPct: `${(HERO_SCREEN_TOP / HERO_PRESENTER_REF_HEIGHT) * 100}%`,
  widthPct: `${(HERO_SCREEN_WIDTH / HERO_PRESENTER_REF_WIDTH) * 100}%`,
  heightPct: `${(HERO_SCREEN_HEIGHT / HERO_PRESENTER_REF_HEIGHT) * 100}%`,
  radiusPct: `${(HERO_SCREEN_RADIUS / HERO_SCREEN_WIDTH) * 100}%`,
  aspectRatio: `${HERO_SCREEN_WIDTH} / ${HERO_SCREEN_HEIGHT}`,
} as const;

export const HERO_PHONE = {
  leftPct: `${(HERO_PHONE_LEFT / HERO_PRESENTER_REF_WIDTH) * 100}%`,
  topPct: `${(HERO_PHONE_TOP / HERO_PRESENTER_REF_HEIGHT) * 100}%`,
  widthPct: `${(HERO_PHONE_WIDTH / HERO_PRESENTER_REF_WIDTH) * 100}%`,
  heightPct: `${(HERO_PHONE_HEIGHT / HERO_PRESENTER_REF_HEIGHT) * 100}%`,
  scaleX,
  scaleY,
} as const;
