/**
 * Director session quota: 40 USER interactions, remaining notices, bounded history.
 *
 * Run: npx tsx --test tests/director-session-limit.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCreativeProposal } from "../lib/creative-director/engine.ts";
import type {
  ConversationMessage,
  CreativeDirectorProvider,
  ProjectContext,
} from "../lib/creative-director/types.ts";
import {
  ANON_DIRECTOR_RATE_LIMIT,
  AUTH_DIRECTOR_RATE_LIMIT,
  DIRECTOR_SESSION_MAX_USER_INTERACTIONS,
  DIRECTOR_SESSION_WARNING_AFTER_USER_INTERACTIONS,
  MAX_CONVERSATION_HISTORY_MESSAGES,
  MAX_CONVERSATION_HISTORY_PAYLOAD_MESSAGES,
  MAX_CONVERSATION_MESSAGE_LENGTH,
  MAX_CUSTOMER_MESSAGE_LENGTH,
} from "../lib/security/limits.ts";
import {
  assertCustomerMessageLength,
  sanitizeConversationHistory,
} from "../lib/security/validation.ts";
import {
  DIRECTOR_PRE_PRODUCTION_WELCOME,
  PREVIEW_COMPANION_WELCOME,
} from "../lib/studio/creative-director-companion.ts";
import {
  boundConversationHistoryForModel,
  countDirectorUserInteractions,
  DIRECTOR_GENERIC_CONTINUATION_ERROR,
  DIRECTOR_SESSION_LIMIT_CODE,
  DIRECTOR_SESSION_REMAINING_NOTICE_VALUES,
  getDirectorRemainingInteractionsNotice,
  getDirectorSessionCopy,
  isDirectorSessionLimitReached,
} from "../lib/studio/director-session.ts";
import { resolveDirectorComposerAction } from "../lib/studio/director-execution-approval.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function customerHistory(count: number): ConversationMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: "customer" as const,
    content: `Customer ${index + 1}`,
  }));
}

function mixedHistory(userCount: number): ConversationMessage[] {
  const messages: ConversationMessage[] = [
    { role: "director", content: DIRECTOR_PRE_PRODUCTION_WELCOME },
  ];

  for (let index = 0; index < userCount; index += 1) {
    messages.push({ role: "customer", content: `Customer ${index + 1}` });
    messages.push({ role: "director", content: `Director ${index + 1}` });
  }

  messages.push({ role: "director", content: PREVIEW_COMPANION_WELCOME });
  return messages;
}

test("31 user interactions require no remaining warning", () => {
  assert.equal(getDirectorRemainingInteractionsNotice(31), null);
  assert.equal(isDirectorSessionLimitReached(31), false);
});

test("32 user interactions surface 8 remaining", () => {
  assert.equal(DIRECTOR_SESSION_WARNING_AFTER_USER_INTERACTIONS, 32);
  assert.equal(getDirectorRemainingInteractionsNotice(32), 8);
  assert.equal(getDirectorSessionCopy("es").remaining(8), "Te quedan 8 interacciones en esta sesión de Director.");
  assert.equal(getDirectorSessionCopy("en").remaining(8), "You have 8 interactions left in this Director session.");
});

test("35 user interactions surface 5 remaining", () => {
  assert.equal(getDirectorRemainingInteractionsNotice(35), 5);
});

test("37 user interactions surface 3 remaining", () => {
  assert.equal(getDirectorRemainingInteractionsNotice(37), 3);
});

test("39 user interactions surface 1 remaining", () => {
  assert.equal(getDirectorRemainingInteractionsNotice(39), 1);
  assert.equal(getDirectorSessionCopy("es").remaining(1), "Te queda 1 interacción en esta sesión de Director.");
  assert.equal(getDirectorSessionCopy("en").remaining(1), "You have 1 interaction left in this Director session.");
});

test("40 user interactions produce the graceful session-limit state", () => {
  assert.equal(DIRECTOR_SESSION_MAX_USER_INTERACTIONS, 40);
  assert.equal(isDirectorSessionLimitReached(40), true);
  assert.equal(getDirectorRemainingInteractionsNotice(40), null);
  assert.deepEqual([...DIRECTOR_SESSION_REMAINING_NOTICE_VALUES], [8, 5, 3, 1]);

  const action = resolveDirectorComposerAction({
    composerText: "otra idea",
    messages: customerHistory(40),
  });
  assert.equal(action.type, "session_limit");

  const es = getDirectorSessionCopy("es");
  const en = getDirectorSessionCopy("en");
  assert.match(es.limitTitle, /límite/i);
  assert.match(es.limitBody, /siguen guardados/i);
  assert.match(es.newSessionContext, /no hereda este chat/i);
  assert.match(en.limitTitle, /limit/i);
  assert.match(en.limitBody, /remain saved/i);
  assert.match(en.newSessionContext, /does not inherit this chat/i);
});

test("40 user interactions do not produce the generic Director continuation error", () => {
  const es = getDirectorSessionCopy("es");
  const en = getDirectorSessionCopy("en");
  const productCopy = [
    es.limitTitle,
    es.limitBody,
    es.newSessionContext,
    es.newSession,
    en.limitTitle,
    en.limitBody,
    en.newSessionContext,
    en.newSession,
  ].join(" ");

  assert.equal(
    productCopy.includes(DIRECTOR_GENERIC_CONTINUATION_ERROR),
    false,
  );

  const panel = readRepo("components/studio/CreativeDirectorPanel.tsx");
  const sessionBlock = panel.slice(
    panel.indexOf("sessionLimitReached ?"),
    panel.indexOf("shouldShowRegistrationInvite"),
  );
  assert.doesNotMatch(sessionBlock, /No pude continuar la conversación/);
  assert.match(panel, /DIRECTOR_GENERIC_CONTINUATION_ERROR/);
  assert.match(panel, /decision\.type === "session_limit"/);
  assert.match(panel, /requestCreativeDirector/);
  assert.ok(
    panel.indexOf('if (decision.type === "session_limit")') <
      panel.indexOf("await requestCreativeDirector("),
  );
});

test("Director, companion, and internal messages do not consume user interaction quota", () => {
  const history = mixedHistory(10);
  assert.ok(history.length > 10);
  assert.equal(countDirectorUserInteractions(history), 10);
  assert.equal(isDirectorSessionLimitReached(history.length), false);
  assert.equal(getDirectorRemainingInteractionsNotice(10), null);

  const withProposalCard = [
    ...history,
    {
      role: "director" as const,
      content: "Propuesta",
      proposal: { narrative: "Usar esta propuesta conceptually" },
    },
  ];
  assert.equal(countDirectorUserInteractions(withProposalCard), 10);
});

test("internal conversation history is bounded before the Director model", async () => {
  assert.equal(MAX_CONVERSATION_HISTORY_MESSAGES, 20);

  const unbounded = mixedHistory(40);
  assert.ok(unbounded.length > MAX_CONVERSATION_HISTORY_MESSAGES);

  const bounded = boundConversationHistoryForModel(unbounded);
  assert.equal(bounded?.length, MAX_CONVERSATION_HISTORY_MESSAGES);
  assert.equal(bounded?.[bounded.length - 1]?.content, unbounded[unbounded.length - 1]?.content);

  const seen: Array<ProjectContext["conversationHistory"]> = [];
  const provider: CreativeDirectorProvider = {
    async generate(request) {
      seen.push(request.projectContext.conversationHistory);
      return { message: "ok", needsClarification: false };
    },
  };

  await createCreativeProposal(
    {
      customerMessage: "sigue",
      projectContext: { conversationHistory: unbounded },
    },
    { provider },
  );

  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.length, MAX_CONVERSATION_HISTORY_MESSAGES);
});

test("existing message-length and rate-limit protections remain intact", () => {
  assert.equal(MAX_CUSTOMER_MESSAGE_LENGTH, 2_000);
  assert.equal(MAX_CONVERSATION_MESSAGE_LENGTH, 2_000);
  assert.equal(AUTH_DIRECTOR_RATE_LIMIT, 60);
  assert.equal(ANON_DIRECTOR_RATE_LIMIT, 15);
  assert.equal(MAX_CONVERSATION_HISTORY_PAYLOAD_MESSAGES, 120);

  assert.doesNotThrow(() => assertCustomerMessageLength("a".repeat(2_000)));
  assert.throws(
    () => assertCustomerMessageLength("a".repeat(2_001)),
    /customerMessage must be at most 2000 characters/,
  );

  const allowed = mixedHistory(40);
  assert.ok(allowed.length > 20);
  assert.ok(allowed.length <= MAX_CONVERSATION_HISTORY_PAYLOAD_MESSAGES);
  assert.equal(sanitizeConversationHistory(allowed)?.length, allowed.length);

  assert.throws(
    () =>
      sanitizeConversationHistory(
        customerHistory(MAX_CONVERSATION_HISTORY_PAYLOAD_MESSAGES + 1),
      ),
    /conversationHistory must contain at most 120 messages/,
  );

  assert.throws(
    () =>
      sanitizeConversationHistory([
        { role: "customer", content: "x".repeat(MAX_CONVERSATION_MESSAGE_LENGTH + 1) },
      ]),
    /content exceeds 2000 characters/,
  );

  const route = readRepo("app/api/creative-director/route.ts");
  assert.match(route, /ANON_DIRECTOR_RATE_LIMIT/);
  assert.match(route, /AUTH_DIRECTOR_RATE_LIMIT/);
  assert.match(route, /enforceSoftCostControl\(/);
  assert.match(route, /DIRECTOR_SESSION_LIMIT_CODE/);
  assert.match(route, /countDirectorUserInteractions/);
  assert.doesNotMatch(route, /checkRateLimit\(/);
});
