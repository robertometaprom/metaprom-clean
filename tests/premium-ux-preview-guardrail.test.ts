import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("Biblioteca hands a verified asset and payment method to CreativeDirector", () => {
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  const studioPage = readRepo("app/studio/StudioPageClient.tsx");
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.doesNotMatch(biblioteca, /purchaseHdCommercial/);
  assert.match(biblioteca, /onPremiumUnlock\?\.\(asset\.id, paymentMethod\)/);
  assert.match(studioPage, /setLibraryOpen\(false\)/);
  assert.match(studioPage, /setPremiumUnlockRequest/);
  assert.match(director, /savedAssetIdRef\.current = premiumUnlockRequest\.assetId/);
  assert.match(director, /startCheckoutPurchase\(premiumUnlockRequest\.paymentMethod/);
});

test("the existing Premium state machine and Director progress stage are reused", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /setPhase\("processing_payment"\)/);
  assert.match(director, /setPhase\("processing_premium"\)/);
  assert.match(director, /key="premium-director-stage"/);
  assert.match(director, /<DirectorStage mode="working">/);
  assert.match(director, /<StudioProgress/);
  assert.match(director, /phase === "preview"/);
  assert.match(director, /premiumPhaseActive/);
});

test("Preview and Checkout Premium CTAs use production-oriented copy", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const checkout = readRepo("components/checkout/Checkout.tsx");

  assert.match(reveal, /Produce tu comercial completo/);
  assert.doesNotMatch(reveal, /Desbloquear comercial completo/);
  assert.match(checkout, /Produce tu comercial completo/);
  assert.doesNotMatch(checkout, /Desbloquea el comercial completo/);
});

test("premium production phase hides checkout payment surface", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const premiumStageMatch = director.match(
    /key="premium-director-stage"[\s\S]*?<\/motion\.div>\s*\) : \(/,
  );

  assert.ok(premiumStageMatch, "premium-director-stage block should exist");
  assert.doesNotMatch(premiumStageMatch[0], /<Checkout/);
  assert.match(director, /directorStageActive =[\s\S]*premiumPhaseActive/);
  assert.match(director, /setDirectorPanelOpen\(false\)/);
});

test("premium completion still transitions to existing ready behavior", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");

  assert.match(director, /setPhase\(result\.premiumVideoUrl \? "ready" : "processing_premium"\)/);
  assert.match(director, /phase === "ready" && videoUrl/);
  assert.match(director, /setPremiumProgressComplete\(true\)/);
});

test("handoff is one-shot and does not introduce duplicate checkout or generation", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");

  assert.match(director, /premiumUnlockRequestHandledRef\.current === premiumUnlockRequest\.id/);
  assert.match(director, /premiumUnlockRequestHandledRef\.current = premiumUnlockRequest\.id/);
  assert.doesNotMatch(biblioteca, /\/api\/studio\/premium-video/);
  assert.doesNotMatch(biblioteca, /\/api\/payments\/checkout/);
});

test("unpaid image and video Preview surfaces expose no download or copy action", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  const experience = readRepo("components/experience/ExperienceFlow.tsx");

  assert.doesNotMatch(director, /Descargar vista previa/);
  assert.doesNotMatch(reveal, /onDownloadImage|hasPremiumImage|Descargar imagen de apoyo/);
  assert.match(biblioteca, /\(!hasTeaser \|\| premiumOwned\)/);
  assert.match(experience, /\{purchased && premiumImage && \(/);
  assert.doesNotMatch(reveal, /variant="prominent"|variant="compact"/);
  assert.doesNotMatch(biblioteca, /variant="prominent"|variant="compact"/);
});

test("Preview sharing is WhatsApp-only and targets the branded public URL", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const review = readRepo("components/studio/DirectorReviewInvite.tsx");
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  const actions = readRepo("components/share/ShareCommercialActions.tsx");
  const messages = readRepo("lib/share/whatsapp-message.ts");

  assert.match(reveal, /variant="whatsapp"/);
  assert.match(review, /variant="whatsapp"/);
  assert.match(biblioteca, /variant="whatsapp"/);
  assert.match(actions, /isWhatsAppVariant/);
  assert.match(actions, /shareWhatsApp\("review_cta"\)/);
  assert.match(actions, /ShareWhatsAppQrPanel/);
  assert.match(messages, /publicPreviewUrl/);
  assert.doesNotMatch(messages, /supabase|teaser_video|premium_video|\.mp4/i);
});

test("Preview playback remains inline with browser download deterrents", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");

  assert.match(reveal, /playsInline/);
  assert.match(reveal, /controlsList="nodownload noremoteplayback"/);
  assert.match(reveal, /onCanPlay=\{handleVideoCanPlay\}/);
  assert.match(biblioteca, /controls/);
  assert.match(biblioteca, /controlsList="nodownload noremoteplayback"/);
});

test("offer-stage replay re-enters existing playback on the same videoUrl", () => {
  const reveal = readRepo("components/studio/CinematicReveal.tsx");

  assert.match(reveal, /onClick=\{\(\) => setStage\("playback"\)\}/);
  assert.match(reveal, /\{offerReplayControl\}/);
  assert.match(
    reveal,
    /const handleVideoEnded = \(\) => \{\s*videoRef\.current\?\.pause\(\);\s*setStage\("offer"\);\s*\};/,
  );
  assert.match(reveal, /if \(playbackInitiatedRef\.current\) return;/);
  assert.match(reveal, /video\.currentTime = 0;/);
  assert.doesNotMatch(reveal, /controls(?!List)/);
  assert.doesNotMatch(reveal, /fetch\(|\/api\/studio|generateVideo|createPreview/);
});

test("paid Premium viewing and download controls remain intact", () => {
  const director = readRepo("components/studio/CreativeDirector.tsx");
  const biblioteca = readRepo("components/biblioteca/Biblioteca.tsx");
  const experience = readRepo("components/experience/ExperienceFlow.tsx");

  assert.match(director, /Descargar comercial HD/);
  assert.match(biblioteca, /premiumUrl && \(/);
  assert.match(biblioteca, /metaprom-\$\{asset\.id\}-comercial-hd\.mp4/);
  assert.match(experience, /purchased && videoUrl/);
  assert.match(experience, /purchased && premiumImage/);
});
