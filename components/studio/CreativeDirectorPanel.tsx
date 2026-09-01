"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import DirectorStage from "@/components/studio/DirectorStage";
import type {
  CommercialProposal,
  ConversationMessage,
  CreativeDirectorResponse,
  DirectorModification,
  ProjectContext,
} from "@/lib/creative-director/types";
import {
  DIRECTOR_PRE_PRODUCTION_WELCOME,
  getCompanionHeaderSubtitle,
  getCompanionWelcomeMessage,
  type CompanionMoment,
} from "@/lib/studio/creative-director-companion";
import { RATE_LIMITED_CODE } from "@/lib/security/cost-control-messages";
import {
  DIRECTOR_REVISION_RETRY_ACTION,
  directorTurnBlocksProposalActions,
  resolveDirectorRevisionResponse,
} from "@/lib/creative-director/revision";
import {
  findLatestCompletedProposal,
  findLatestDirectorMessage,
  resolveDirectorComposerAction,
} from "@/lib/studio/director-execution-approval";
import {
  countDirectorUserInteractions,
  DIRECTOR_GENERIC_CONTINUATION_ERROR,
  DIRECTOR_SESSION_LIMIT_CODE,
  getDirectorRemainingInteractionsNotice,
  getDirectorSessionCopy,
  getDirectorSessionLocale,
  isDirectorSessionLimitReached,
} from "@/lib/studio/director-session";
import {
  resolveCreativeDirectorApiPath,
  validateDirectorV2DryRunProposal,
} from "@/lib/studio/director-v2-dry-run";

type PanelMessage = {
  id: string;
  role: "customer" | "director";
  content: string;
  proposal?: CommercialProposal;
  modifications?: DirectorModification[];
  needsClarification?: boolean;
  revisionApplyFailed?: boolean;
};

export type SerializablePanelMessage = PanelMessage;

export type CreativeDirectorPanelProps = {
  open: boolean;
  onClose: () => void;
  projectContext: ProjectContext;
  onUseProposal: (proposal: CommercialProposal) => void;
  /** Start a fresh Director conversation without clearing project / Preview / assets. */
  onStartFreshDirectorSession?: () => void;
  /** Milestone companion moment requested by Studio orchestration. */
  pendingCompanionMoment?: CompanionMoment | null;
  onCompanionMomentHandled?: (moment: CompanionMoment) => void;
  /** Changes when Studio starts a new commercial session. */
  sessionKey: string;
  initialMessages?: SerializablePanelMessage[];
  onMessagesChange?: (messages: SerializablePanelMessage[]) => void;
  authRedirectTo?: string;
  showRegistrationInvite?: boolean;
  /** Raise above CinematicReveal (z-100) when the panel opens on the post-preview screen. */
  stackLayer?: "default" | "elevated";
  /**
   * `overlay` — full-viewport DirectorStage (ACTIVE / TALKING).
   * `embedded` — conversation surface only for REVIEW split (artwork lives in parent).
   */
  presentation?: "overlay" | "embedded";
  /** Host node for embedded REVIEW conversation (same panel instance / session). */
  embeddedHostRef?: RefObject<HTMLElement | null>;
  /** Optional secondary creation paths (e.g. manual Studio chooser on welcome). */
  secondaryActions?: ReactNode;
  /** Permanent Studio photo tools shown above the composer whenever the panel is open. */
  photoActions?: ReactNode;
  /** Compact account entry (login/register) for unauthenticated Studio — header area only. */
  accountActions?: ReactNode;
  /** When true, desktop Director stage shifts left to clear the Biblioteca panel. */
  libraryOpen?: boolean;
  /** Route Director traffic to /api/creative-director-v2. */
  directorV2Api?: boolean;
  /** Test-only: block generation handoff and show dry-run indicator. */
  directorV2DryRun?: boolean;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toConversationHistory(messages: PanelMessage[]): ConversationMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function requestCreativeDirector(
  input: {
    customerMessage: string;
    projectContext: ProjectContext;
  },
  apiPath: string,
): Promise<CreativeDirectorResponse> {
  const response = await fetch(apiPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  let payload: CreativeDirectorResponse | { error?: string; code?: string };
  try {
    payload = (await response.json()) as
      | CreativeDirectorResponse
      | { error?: string; code?: string };
  } catch {
    throw new Error(DIRECTOR_GENERIC_CONTINUATION_ERROR);
  }

  if (!response.ok) {
    const errorMessage =
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Creative Director request failed.";
    const error = new Error(errorMessage) as Error & {
      code?: string;
      status?: number;
    };
    error.code =
      "code" in payload && typeof payload.code === "string"
        ? payload.code
        : undefined;
    error.status = response.status;
    throw error;
  }

  return payload as CreativeDirectorResponse;
}

/**
 * Conversation owner for Director multi-turn state.
 * ACTIVE / conversation presentation uses the same UX2 `DirectorStage`
 * shell as WORKING generation — swap children only; session/messages stay here.
 */
export default function CreativeDirectorPanel({
  open,
  onClose,
  projectContext,
  onUseProposal,
  onStartFreshDirectorSession,
  pendingCompanionMoment = null,
  onCompanionMomentHandled,
  sessionKey,
  initialMessages = [],
  onMessagesChange,
  authRedirectTo = "/studio",
  showRegistrationInvite = false,
  stackLayer = "default",
  presentation = "overlay",
  embeddedHostRef,
  secondaryActions = null,
  photoActions = null,
  accountActions = null,
  libraryOpen = false,
  directorV2Api = false,
  directorV2DryRun = false,
}: CreativeDirectorPanelProps) {
  const stageZ = stackLayer === "elevated" ? "z-[120]" : "z-50";
  const isEmbedded = presentation === "embedded";
  const [embeddedHost, setEmbeddedHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isEmbedded) {
      setEmbeddedHost(null);
      return;
    }
    setEmbeddedHost(embeddedHostRef?.current ?? null);
  }, [embeddedHostRef, isEmbedded, open]);
  const [messages, setMessages] = useState<PanelMessage[]>(initialMessages);
  const [composerValue, setComposerValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(
    null,
  );
  const [editedProposalText, setEditedProposalText] = useState("");
  const [activeCompanionMoment, setActiveCompanionMoment] =
    useState<CompanionMoment | null>(null);
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [thinkingCopyIndex, setThinkingCopyIndex] = useState(0);

  const conversationRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const handledCompanionMomentsRef = useRef<Set<CompanionMoment>>(new Set());
  const initialMessagesRef = useRef(initialMessages);
  initialMessagesRef.current = initialMessages;

  const thinkingCopy = [
    "Director está pensando…",
    "Director está preparando una respuesta…",
  ][thinkingCopyIndex % 2];

  const resetPanel = useCallback(() => {
    handledCompanionMomentsRef.current = new Set();
    setActiveCompanionMoment(null);
    setMessages(initialMessagesRef.current);
    setComposerValue("");
    setIsLoading(false);
    setError(null);
    setEditingProposalId(null);
    setEditedProposalText("");
    setRegistrationRequired(false);
  }, []);

  // Intentional conversation/session reset only — not ordinary message sync.
  useEffect(() => {
    resetPanel();
  }, [resetPanel, sessionKey]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  const appendDirectorMessage = useCallback((content: string) => {
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "director",
        content,
      },
    ]);
  }, []);

  const ensurePreProductionWelcome = useCallback(() => {
    setMessages((current) => {
      if (current.length > 0) return current;

      return [
        {
          id: createMessageId(),
          role: "director",
          content: DIRECTOR_PRE_PRODUCTION_WELCOME,
        },
      ];
    });
  }, []);

  useEffect(() => {
    if (!open || pendingCompanionMoment) return;
    ensurePreProductionWelcome();
  }, [ensurePreProductionWelcome, open, pendingCompanionMoment]);

  useEffect(() => {
    if (!pendingCompanionMoment) return;
    if (handledCompanionMomentsRef.current.has(pendingCompanionMoment)) {
      onCompanionMomentHandled?.(pendingCompanionMoment);
      return;
    }

    handledCompanionMomentsRef.current.add(pendingCompanionMoment);
    setActiveCompanionMoment(pendingCompanionMoment);
    appendDirectorMessage(
      getCompanionWelcomeMessage(pendingCompanionMoment),
    );
    onCompanionMomentHandled?.(pendingCompanionMoment);
  }, [
    appendDirectorMessage,
    onCompanionMomentHandled,
    pendingCompanionMoment,
  ]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      conversationRef.current?.scrollTo({
        top: conversationRef.current.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, open, isLoading]);

  useEffect(() => {
    if (!open) return;
    composerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!isLoading) {
      setThinkingCopyIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setThinkingCopyIndex((current) => current + 1);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const buildRequestContext = useCallback(
    (history: PanelMessage[]): ProjectContext => {
      const lastCompletedProposal = findLatestCompletedProposal(history);
      return {
        ...projectContext,
        conversationHistory: toConversationHistory(history),
        ...(lastCompletedProposal
          ? { lastCompletedProposal }
          : {}),
      };
    },
    [projectContext],
  );

  const handleUseProposal = useCallback(
    (proposal: CommercialProposal, narrative: string) => {
      const trimmed = narrative.trim();
      if (!trimmed) return;

      if (directorV2DryRun) {
        const validation = validateDirectorV2DryRunProposal({
          ...proposal,
          narrative: trimmed,
        });
        appendDirectorMessage(validation.message);
        return;
      }

      // Handoff only — parent transitions Studio phase to intent; never navigate.
      onUseProposal({ ...proposal, narrative: trimmed });
      onClose();
    },
    [appendDirectorMessage, directorV2DryRun, onClose, onUseProposal],
  );

  const handleSend = useCallback(
    async (event?: FormEvent, overrideText?: string) => {
      event?.preventDefault();

      const trimmed = (overrideText ?? composerValue).trim();
      if (!trimmed || isLoading) return;

      const decision = resolveDirectorComposerAction({
        composerText: trimmed,
        messages,
        editedProposalText,
        editingProposalId,
      });

      if (decision.type === "session_limit") {
        setComposerValue("");
        setError(null);
        return;
      }

      if (decision.type === "accept_proposal") {
        setComposerValue("");
        setError(null);
        handleUseProposal(decision.proposal, decision.narrative);
        return;
      }

      const customerMessage: PanelMessage = {
        id: createMessageId(),
        role: "customer",
        content: trimmed,
      };

      const nextMessages = [...messages, customerMessage];
      setMessages(nextMessages);
      setComposerValue("");
      setError(null);
      setIsLoading(true);
      setEditingProposalId(null);

      try {
        const response = await requestCreativeDirector(
          {
            customerMessage: trimmed,
            projectContext: buildRequestContext(messages),
          },
          resolveCreativeDirectorApiPath(directorV2Api),
        );

        const priorProposal = findLatestCompletedProposal(messages);
        const resolved = resolveDirectorRevisionResponse({
          lastCompletedProposal: priorProposal,
          response,
        });

        const directorMessage: PanelMessage = {
          id: createMessageId(),
          role: "director",
          content: resolved.message,
          proposal: resolved.proposal,
          modifications: resolved.modifications,
          needsClarification: resolved.needsClarification,
          revisionApplyFailed: resolved.revisionApplyFailed,
        };

        setMessages((current) => [...current, directorMessage]);

        if (response.requiresRegistration) {
          setRegistrationRequired(true);
        }
      } catch (caught) {
        const code =
          caught instanceof Error && "code" in caught
            ? typeof (caught as { code?: unknown }).code === "string"
              ? (caught as { code: string }).code
              : undefined
            : undefined;
        const status =
          caught instanceof Error && "status" in caught
            ? typeof (caught as { status?: unknown }).status === "number"
              ? (caught as { status: number }).status
              : undefined
            : undefined;
        const serverMessage =
          caught instanceof Error ? caught.message : "";

        setMessages((current) => current.slice(0, -1));

        if (code === DIRECTOR_SESSION_LIMIT_CODE) {
          setError(null);
          setComposerValue("");
          return;
        }

        if (
          code === RATE_LIMITED_CODE ||
          status === 400 ||
          status === 413 ||
          status === 429
        ) {
          setError(serverMessage || DIRECTOR_GENERIC_CONTINUATION_ERROR);
          setComposerValue(trimmed);
          return;
        }

        setError(DIRECTOR_GENERIC_CONTINUATION_ERROR);
        setComposerValue(trimmed);
      } finally {
        setIsLoading(false);
      }
    },
    [
      buildRequestContext,
      composerValue,
      editedProposalText,
      editingProposalId,
      directorV2Api,
      handleUseProposal,
      isLoading,
      messages,
    ],
  );

  const handleStartEditing = useCallback(
    (messageId: string, proposal: CommercialProposal) => {
      setEditingProposalId(messageId);
      setEditedProposalText(proposal.narrative);
    },
    [],
  );

  const latestProposalMessageId = useMemo(() => {
    if (directorTurnBlocksProposalActions(findLatestDirectorMessage(messages))) {
      return null;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.proposal) {
        return messages[index]?.id ?? null;
      }
    }
    return null;
  }, [messages]);

  const handleRetryRevision = useCallback(() => {
    const lastCustomer = [...messages]
      .reverse()
      .find((message) => message.role === "customer");
    if (!lastCustomer?.content.trim() || isLoading) return;
    void handleSend(undefined, lastCustomer.content);
  }, [handleSend, isLoading, messages]);

  const shouldShowRegistrationInvite =
    showRegistrationInvite || registrationRequired;

  const userInteractionCount = countDirectorUserInteractions(messages);
  const sessionLimitReached = isDirectorSessionLimitReached(userInteractionCount);
  const remainingNotice = getDirectorRemainingInteractionsNotice(
    userInteractionCount,
  );
  const sessionCopy = getDirectorSessionCopy(getDirectorSessionLocale());
  const composerLocked =
    isLoading || registrationRequired || sessionLimitReached;

  const headerSubtitle = activeCompanionMoment
    ? getCompanionHeaderSubtitle(activeCompanionMoment)
    : isEmbedded
      ? "Conversemos sobre el resultado — los cambios no se generan solos."
      : "Te ayudo a definir tu comercial antes de producirlo.";

  if (!open) return null;

  // Biblioteca open (desktop only): nudge interaction column 24px left.
  // Artwork / DirectorStage row / presence / closed state stay untouched.
  const libraryInteractionShiftClass =
    !isEmbedded && libraryOpen ? "sm:-translate-x-[24px]" : "";

  const conversationBody = (
        <div
          className={
            isEmbedded
              ? "flex h-[min(calc(100dvh-10rem),78vh)] flex-col text-left sm:h-[min(calc(100dvh-9rem),82vh)] lg:h-[min(calc(100dvh-8rem),86vh)]"
              : `flex h-[min(calc(100dvh-5.5rem),92vh)] flex-col text-left sm:h-[min(calc(100dvh-6rem),93vh)] lg:h-[min(calc(100dvh-7.5rem),94vh)] ${libraryInteractionShiftClass}`
          }
        >
          {directorV2DryRun ? (
            <div
              className="mb-2 shrink-0 rounded-lg border border-amber-400/40 bg-amber-950/50 px-2.5 py-1.5 text-xs text-amber-100 sm:flex sm:items-baseline sm:gap-2"
              role="status"
              data-testid="director-v2-dry-run-indicator"
            >
              <p className="font-semibold uppercase tracking-[0.12em]">
                DIRECTOR V2 — DRY RUN
              </p>
              <p className="mt-0.5 text-amber-100/85 sm:mt-0">
                Generación desactivada
              </p>
            </div>
          ) : null}

          <header className="mb-2 flex shrink-0 items-start justify-between gap-3 md:mb-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">
                Director Creativo
              </p>
              {/* Mobile welcome: one compact invitation. Desktop/companion copy unchanged. */}
              {!activeCompanionMoment && !isEmbedded ? (
                <>
                  <p className="mt-1 text-sm leading-relaxed text-white/70 md:hidden">
                    Cuéntame qué quieres crear o qué quieres vender.
                  </p>
                  <p className="mt-1 hidden text-sm leading-relaxed text-white/70 md:block">
                    {headerSubtitle}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  {headerSubtitle}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {accountActions ? (
                <div
                  className="mr-0.5 flex items-center gap-0.5"
                  aria-label="Acceso a cuenta"
                >
                  {accountActions}
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar Director Creativo"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={conversationRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "customer"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "customer"
                      ? "max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm leading-relaxed text-white"
                      : "max-w-[95%] space-y-3"
                  }
                >
                  {message.role === "director" ? (
                    <>
                      {message.content === DIRECTOR_PRE_PRODUCTION_WELCOME ? (
                        <div className="hidden text-sm leading-relaxed text-white/90 md:block md:text-[15px]">
                          {message.content.split("\n").map((line, index) => (
                            <p
                              key={`${message.id}-line-${index}`}
                              className={index > 0 ? "mt-2" : ""}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed text-white/90 sm:text-[15px]">
                          {message.content.split("\n").map((line, index) => (
                            <p
                              key={`${message.id}-line-${index}`}
                              className={index > 0 ? "mt-2" : ""}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      )}

                      {message.modifications &&
                      message.modifications.length > 0 ? (
                        <div className="space-y-2 border-l-2 border-amber-300/70 pl-3 text-sm text-amber-50/95">
                          {message.modifications.map((modification, index) => (
                            <div key={`${message.id}-mod-${index}`}>
                              <p className="font-medium">
                                {modification.whatChanged}
                              </p>
                              <p className="mt-1 text-amber-100/75">
                                {modification.whyChanged}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {message.proposal ? (
                        <ProposalCard
                          proposal={message.proposal}
                          isEditing={editingProposalId === message.id}
                          editedText={editedProposalText}
                          onEditedTextChange={setEditedProposalText}
                          onUse={() =>
                            handleUseProposal(
                              message.proposal!,
                              editingProposalId === message.id
                                ? editedProposalText
                                : message.proposal!.narrative,
                            )
                          }
                          onEdit={() =>
                            handleStartEditing(message.id, message.proposal!)
                          }
                          onCancelEdit={() => {
                            setEditingProposalId(null);
                            setEditedProposalText("");
                          }}
                          isLatest={message.id === latestProposalMessageId}
                        />
                      ) : null}

                      {message.revisionApplyFailed ? (
                        <button
                          type="button"
                          onClick={handleRetryRevision}
                          disabled={isLoading}
                          className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {DIRECTOR_REVISION_RETRY_ACTION}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div
                  className="text-sm text-white/70"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center gap-1"
                    >
                      <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
                      <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
                      <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
                    </span>
                    <span>{thinkingCopy}</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 shrink-0 space-y-2 md:mt-4 md:space-y-3">
            {error ? (
              <div className="rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                <p>{error}</p>
              </div>
            ) : null}

            {sessionLimitReached ? (
              <div
                className="space-y-3 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-white/85"
                role="status"
              >
                <p className="font-medium text-white">{sessionCopy.limitTitle}</p>
                <p>{sessionCopy.limitBody}</p>
                <p className="text-white/70">{sessionCopy.newSessionContext}</p>
                {onStartFreshDirectorSession ? (
                  <button
                    type="button"
                    onClick={onStartFreshDirectorSession}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
                  >
                    {sessionCopy.newSession}
                  </button>
                ) : null}
              </div>
            ) : remainingNotice !== null ? (
              <p className="text-sm text-white/65" role="status">
                {sessionCopy.remaining(remainingNotice)}
              </p>
            ) : null}

            {shouldShowRegistrationInvite ? (
              <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4">
                <p className="text-sm leading-relaxed text-white/85">
                  {pendingCompanionMoment === "generate_invitation" ||
                  activeCompanionMoment === "generate_invitation"
                    ? "Guarda tu proyecto y crea tu primera Imagen Publicitaria gratis."
                    : "Crea tu cuenta gratuita para guardar este comercial y continuar donde te quedaste."}
                </p>
                <GoogleSignInButton
                  redirectTo={authRedirectTo}
                  label={
                    pendingCompanionMoment === "generate_invitation" ||
                    activeCompanionMoment === "generate_invitation"
                      ? "Crear cuenta gratis"
                      : "Crear cuenta gratuita"
                  }
                />
                <p className="text-center text-sm text-white/55">
                  ¿Ya tienes cuenta?{" "}
                  <a
                    href={`/login?redirect=${encodeURIComponent(authRedirectTo || "/studio")}`}
                    className="text-white/80 underline decoration-white/30 underline-offset-2 transition hover:text-white hover:decoration-white/60"
                  >
                    Inicia sesión
                  </a>
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSend} className="space-y-2 md:space-y-3">
              {photoActions ? (
                <div aria-label="Acciones de foto">{photoActions}</div>
              ) : null}
              {sessionLimitReached ? null : (
                <>
              <label htmlFor="creative-director-composer" className="sr-only">
                Escribe tu mensaje al Director Creativo
              </label>
              <textarea
                id="creative-director-composer"
                ref={composerRef}
                value={composerValue}
                onChange={(event) => setComposerValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={3}
                placeholder="Escribe aquí..."
                disabled={composerLocked}
                className="w-full resize-none rounded-2xl border border-white/15 bg-black/35 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-fuchsia-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-60 md:py-3"
              />
              <button
                type="submit"
                disabled={
                  !composerValue.trim() || composerLocked
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40 md:py-3.5"
              >
                Enviar
                <span aria-hidden="true">→</span>
              </button>
                </>
              )}
            </form>

            {secondaryActions ? (
              <div className="border-t border-white/10 pt-3">{secondaryActions}</div>
            ) : null}
          </div>
        </div>
  );

  if (isEmbedded) {
    if (!embeddedHost) return null;
    return createPortal(
      <div role="region" aria-label="Director Creativo — revisión">
        {conversationBody}
      </div>,
      embeddedHost,
    );
  }

  return (
    <div
      className={`fixed inset-0 ${stageZ} overflow-hidden bg-[#07070c]`}
      role="dialog"
      aria-modal="true"
      aria-label="Director Creativo"
    >
      <DirectorStage mode="talking" libraryOpen={libraryOpen}>
        {conversationBody}
      </DirectorStage>
    </div>
  );
}

type ProposalCardProps = {
  proposal: CommercialProposal;
  isEditing: boolean;
  editedText: string;
  onEditedTextChange: (value: string) => void;
  onUse: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  isLatest: boolean;
};

function ProposalCard({
  proposal,
  isEditing,
  editedText,
  onEditedTextChange,
  onUse,
  onEdit,
  onCancelEdit,
  isLatest,
}: ProposalCardProps) {
  return (
    <section
      aria-label="Propuesta comercial"
      className="overflow-hidden rounded-2xl border border-white/15 bg-black/30"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-300/90">
          Propuesta comercial
        </p>
        <p className="mt-1 text-sm font-medium text-white">{proposal.summary}</p>
      </div>

      <div className="space-y-3 px-4 py-4 text-sm text-white/80">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(event) => onEditedTextChange(event.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm leading-relaxed text-white focus:border-fuchsia-300/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
          />
        ) : (
          <>
            <ProposalDetail label="Apertura" value={proposal.openingHook} />
            <ProposalDetail label="Momento estrella" value={proposal.productHeroMoment} />
            <ProposalDetail label="Tono" value={proposal.emotionalTone} />
            <ProposalDetail label="Ritmo" value={proposal.pacing} />
            <ProposalDetail label="Cierre" value={proposal.callToAction} />
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 leading-relaxed text-white/85">
              {proposal.narrative}
            </div>
          </>
        )}
      </div>

      {isLatest ? (
        <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 sm:flex-row">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onUse();
            }}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-white/90"
          >
            Usar esta propuesta
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white"
            >
              Editar propuesta
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ProposalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-0.5 leading-relaxed text-white/80">{value}</p>
    </div>
  );
}
