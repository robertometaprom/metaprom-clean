import { directorTurnBlocksProposalActions } from "../creative-director/revision";
import type { CommercialProposal } from "../creative-director/types";
import {
  countDirectorUserInteractions,
  isDirectorSessionLimitReached,
} from "./director-session";

/**
 * Exact normalized utterances that mean "use this proposal".
 * Whole-utterance only — never substring-match "dale" / "hazlo" / "genera".
 */
const EXECUTION_APPROVAL_UTTERANCES = new Set([
  "hazlo",
  "adelante",
  "dale",
  "genera",
  "ya genera",
  "ok hazlo",
  "okay hazlo",
  "perfecto hazlo",
  "me gusta adelante",
  "do it",
  "go ahead",
  "generate",
  "generate it",
  "looks good go ahead",
  "proceed",
]);

export type DirectorComposerMessage = {
  id?: string;
  role: "customer" | "director";
  content?: string;
  proposal?: CommercialProposal;
  needsClarification?: boolean;
  revisionApplyFailed?: boolean;
};

export type DirectorComposerAction =
  | { type: "session_limit" }
  | {
      type: "accept_proposal";
      proposal: CommercialProposal;
      narrative: string;
    }
  | { type: "converse"; message: string };

export function normalizeDirectorApprovalUtterance(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¡!.,;:?¿'"“”‘’]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDirectorExecutionApproval(text: string): boolean {
  const normalized = normalizeDirectorApprovalUtterance(text);
  return EXECUTION_APPROVAL_UTTERANCES.has(normalized);
}

export function findLatestCompletedProposal(
  messages: ReadonlyArray<DirectorComposerMessage>,
): CommercialProposal | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const proposal = messages[index]?.proposal;
    if (!proposal) continue;
    if (proposal.narrative.trim()) {
      return proposal;
    }
  }

  return null;
}

export function findLatestDirectorMessage(
  messages: ReadonlyArray<DirectorComposerMessage>,
): DirectorComposerMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "director") {
      return messages[index] ?? null;
    }
  }

  return null;
}

export function findLatestExecutableProposal(
  messages: ReadonlyArray<DirectorComposerMessage>,
): CommercialProposal | null {
  if (directorTurnBlocksProposalActions(findLatestDirectorMessage(messages))) {
    return null;
  }

  return findLatestCompletedProposal(messages);
}

export function resolveDirectorComposerAction(input: {
  composerText: string;
  messages: ReadonlyArray<DirectorComposerMessage>;
  editedProposalText?: string;
  editingProposalId?: string | null;
}): DirectorComposerAction {
  const message = input.composerText.trim();
  const userInteractions = countDirectorUserInteractions(input.messages);

  if (isDirectorSessionLimitReached(userInteractions)) {
    return { type: "session_limit" };
  }

  if (!message) {
    return { type: "converse", message };
  }

  const proposal = findLatestExecutableProposal(input.messages);

  if (proposal && isDirectorExecutionApproval(message)) {
    const editingThisProposal =
      Boolean(input.editingProposalId) &&
      input.messages.some(
        (entry) =>
          entry.id === input.editingProposalId && entry.proposal === proposal,
      );
    const narrative = editingThisProposal
      ? (input.editedProposalText ?? proposal.narrative).trim()
      : proposal.narrative.trim();

    if (narrative) {
      return {
        type: "accept_proposal",
        proposal,
        narrative,
      };
    }
  }

  return { type: "converse", message };
}
