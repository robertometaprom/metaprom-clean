"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
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

type PanelMessage = {
  id: string;
  role: "customer" | "director";
  content: string;
  proposal?: CommercialProposal;
  modifications?: DirectorModification[];
};

export type SerializablePanelMessage = PanelMessage;

export type CreativeDirectorPanelProps = {
  open: boolean;
  onClose: () => void;
  projectContext: ProjectContext;
  onUseProposal: (narrative: string) => void;
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

async function requestCreativeDirector(input: {
  customerMessage: string;
  projectContext: ProjectContext;
}): Promise<CreativeDirectorResponse> {
  const response = await fetch("/api/creative-director", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as
    | CreativeDirectorResponse
    | { error?: string };

  if (!response.ok) {
    const errorMessage =
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Creative Director request failed.";
    throw new Error(errorMessage);
  }

  return payload as CreativeDirectorResponse;
}

/**
 * Conversation owner for Director multi-turn state.
 * UX2 visual shell (`DirectorStage`) is prepared for a later talking-mode
 * presentation pass — do not relocate session/message architecture here.
 */
export default function CreativeDirectorPanel({
  open,
  onClose,
  projectContext,
  onUseProposal,
  pendingCompanionMoment = null,
  onCompanionMomentHandled,
  sessionKey,
  initialMessages = [],
  onMessagesChange,
  authRedirectTo = "/studio",
  showRegistrationInvite = false,
  stackLayer = "default",
}: CreativeDirectorPanelProps) {
  const backdropZ = stackLayer === "elevated" ? "z-[110]" : "z-40";
  const asideZ = stackLayer === "elevated" ? "z-[120]" : "z-50";
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
    (history: PanelMessage[]): ProjectContext => ({
      ...projectContext,
      conversationHistory: toConversationHistory(history),
    }),
    [projectContext],
  );

  const handleSend = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();

      const trimmed = composerValue.trim();
      if (!trimmed || isLoading) return;

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
        const response = await requestCreativeDirector({
          customerMessage: trimmed,
          projectContext: buildRequestContext(messages),
        });

        const directorMessage: PanelMessage = {
          id: createMessageId(),
          role: "director",
          content: response.message,
          proposal: response.proposal,
          modifications: response.modifications,
        };

        setMessages((current) => [...current, directorMessage]);

        if (response.requiresRegistration) {
          setRegistrationRequired(true);
        }
      } catch {
        setError(
          "No pude continuar la conversación. Intenta enviarlo de nuevo.",
        );
        setMessages((current) => current.slice(0, -1));
        setComposerValue(trimmed);
      } finally {
        setIsLoading(false);
      }
    },
    [buildRequestContext, composerValue, isLoading, messages],
  );

  const handleUseProposal = useCallback(
    (narrative: string) => {
      const trimmed = narrative.trim();
      if (!trimmed) return;
      onUseProposal(trimmed);
      onClose();
    },
    [onClose, onUseProposal],
  );

  const handleStartEditing = useCallback(
    (messageId: string, proposal: CommercialProposal) => {
      setEditingProposalId(messageId);
      setEditedProposalText(proposal.narrative);
    },
    [],
  );

  const latestProposalMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.proposal) {
        return messages[index]?.id ?? null;
      }
    }
    return null;
  }, [messages]);

  const shouldShowRegistrationInvite =
    showRegistrationInvite || registrationRequired;

  const headerSubtitle = activeCompanionMoment
    ? getCompanionHeaderSubtitle(activeCompanionMoment)
    : "Te ayudo a definir tu comercial antes de producirlo.";

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 ${backdropZ} bg-black/20 backdrop-blur-[2px]`}
        aria-label="Cerrar Director Creativo"
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 ${asideZ} flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl`}
      >
        <header className="border-b border-neutral-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                Metaprom Studio
              </p>
              <h2 className="mt-1 text-xl font-bold text-neutral-900">
                Director Creativo
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                {headerSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Cerrar panel"
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
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "customer" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "customer"
                    ? "max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm leading-relaxed text-white"
                    : "max-w-[92%] space-y-3"
                }
              >
                {message.role === "director" ? (
                  <>
                    <div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-800">
                      {message.content.split("\n").map((line, index) => (
                        <p key={`${message.id}-line-${index}`} className={index > 0 ? "mt-2" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {message.modifications && message.modifications.length > 0 ? (
                      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        {message.modifications.map((modification, index) => (
                          <div key={`${message.id}-mod-${index}`}>
                            <p className="font-medium">{modification.whatChanged}</p>
                            <p className="mt-1 text-amber-900/80">{modification.whyChanged}</p>
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
                            editingProposalId === message.id
                              ? editedProposalText
                              : message.proposal!.narrative,
                          )
                        }
                        onEdit={() => handleStartEditing(message.id, message.proposal!)}
                        onCancelEdit={() => {
                          setEditingProposalId(null);
                          setEditedProposalText("");
                        }}
                        isLatest={message.id === latestProposalMessageId}
                      />
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
                className="rounded-2xl rounded-bl-md border border-violet-200/80 bg-violet-50/70 px-4 py-3 text-sm text-neutral-600"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span className="inline-flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center gap-1"
                  >
                    <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <span className="director-thinking-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
                  </span>
                  <span>{thinkingCopy}</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-neutral-200 bg-white px-6 py-4">
          {error ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
            </div>
          ) : null}

          {shouldShowRegistrationInvite ? (
            <div className="mb-4 space-y-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-violet-950">
                Crea tu cuenta gratuita para guardar este comercial y continuar
                donde te quedaste.
              </p>
              <GoogleSignInButton
                redirectTo={authRedirectTo}
                label="Crear cuenta gratuita"
              />
            </div>
          ) : null}

          <form onSubmit={handleSend} className="space-y-3">
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
              placeholder="Cuéntame tu objetivo comercial..."
              disabled={isLoading || registrationRequired}
              className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!composerValue.trim() || isLoading || registrationRequired}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </footer>
      </aside>
    </>
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
      className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white shadow-sm"
    >
      <div className="border-b border-violet-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
          Propuesta comercial
        </p>
        <p className="mt-1 text-sm font-medium text-neutral-900">{proposal.summary}</p>
      </div>

      <div className="space-y-3 px-4 py-4 text-sm text-neutral-700">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(event) => onEditedTextChange(event.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-3 text-sm leading-relaxed text-neutral-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        ) : (
          <>
            <ProposalDetail label="Apertura" value={proposal.openingHook} />
            <ProposalDetail label="Momento estrella" value={proposal.productHeroMoment} />
            <ProposalDetail label="Tono" value={proposal.emotionalTone} />
            <ProposalDetail label="Ritmo" value={proposal.pacing} />
            <ProposalDetail label="Cierre" value={proposal.callToAction} />
            <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3 leading-relaxed">
              {proposal.narrative}
            </div>
          </>
        )}
      </div>

      {isLatest ? (
        <div className="flex flex-col gap-2 border-t border-violet-100 px-4 py-4 sm:flex-row">
          <button
            type="button"
            onClick={onUse}
            className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Usar esta propuesta
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
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
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 leading-relaxed text-neutral-700">{value}</p>
    </div>
  );
}
