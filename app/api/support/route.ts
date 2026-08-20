import { NextResponse } from "next/server";

import {
  claimIdempotencyLock,
  enforceSupportCostControl,
  releaseIdempotencyLock,
  supportUnavailableResponse,
} from "@/lib/security/cost-control";
import {
  MAX_SUPPORT_JSON_BYTES,
  SUPPORT_DUPLICATE_LOCK_TTL_MS,
} from "@/lib/security/limits";
import {
  BodyTooLargeError,
  readJsonBodyWithLimit,
} from "@/lib/security/validation";
import { getSupportMailer } from "@/lib/support/mailer";
import {
  parseSupportRequestBody,
  supportDuplicateFingerprint,
} from "@/lib/support/public";

export const runtime = "nodejs";

function json(body: { ok: true } | { ok: false; code: string }, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await readJsonBodyWithLimit(request, MAX_SUPPORT_JSON_BYTES);
  } catch (error) {
    const status = error instanceof BodyTooLargeError ? 413 : 400;
    return json({ ok: false, code: "invalid" }, status);
  }

  const parsed = parseSupportRequestBody(body);
  if (!parsed.ok) {
    return json({ ok: false, code: "invalid" }, 400);
  }

  if (parsed.honeypot) {
    return json({ ok: true });
  }

  const limited = await enforceSupportCostControl({ request });
  if (limited) return limited;

  const { payload } = parsed;
  const requestLock = await claimIdempotencyLock(
    "support-req",
    payload.requestId,
    SUPPORT_DUPLICATE_LOCK_TTL_MS,
  );
  if (requestLock.storageFailure) return supportUnavailableResponse();
  if (!requestLock.claimed) {
    return json({ ok: true });
  }

  const contentKey = supportDuplicateFingerprint(payload);
  const contentLock = await claimIdempotencyLock(
    "support-dup",
    contentKey,
    SUPPORT_DUPLICATE_LOCK_TTL_MS,
  );
  if (contentLock.storageFailure) {
    await releaseIdempotencyLock("support-req", payload.requestId);
    return supportUnavailableResponse();
  }
  if (!contentLock.claimed) {
    return json({ ok: true });
  }

  const sent = await getSupportMailer().send(payload);
  if (!sent.ok) {
    await releaseIdempotencyLock("support-req", payload.requestId);
    await releaseIdempotencyLock("support-dup", contentKey);
    return json({ ok: false, code: "unavailable" }, 503);
  }

  return json({ ok: true });
}
