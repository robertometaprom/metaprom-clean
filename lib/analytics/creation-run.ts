import { CREATION_RUN_ID_FIELD, isUuid } from "@/lib/analytics/ids";

export function readCreationRunId(formData: FormData): string {
  const raw = formData.get(CREATION_RUN_ID_FIELD);
  if (typeof raw === "string" && isUuid(raw)) {
    return raw;
  }
  return crypto.randomUUID();
}

export function appendCreationRunId(formData: FormData, runId: string) {
  formData.append(CREATION_RUN_ID_FIELD, runId);
}
