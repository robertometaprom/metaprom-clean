export type ExperiencePhase =
  | "landing"
  | "upload"
  | "intent"
  | "generate"
  | "login"
  | "generating"
  | "cinematic-reveal"
  | "checkout"
  | "library"
  | "download-center"
  | "create-another";

export type ExperienceCreation = {
  intent: string;
  previewUrl: string | null;
  premiumImage: string | null;
  videoUrl: string | null;
  purchased: boolean;
  projectName: string;
};

export const EXPERIENCE_PHASES: ExperiencePhase[] = [
  "landing",
  "upload",
  "intent",
  "generate",
  "login",
  "generating",
  "cinematic-reveal",
  "checkout",
  "library",
  "download-center",
  "create-another",
];

export const EXPERIENCE_PHASE_LABELS: Record<ExperiencePhase, string> = {
  landing: "Inicio",
  upload: "Subir",
  intent: "Intención",
  generate: "Generar",
  login: "Guardar",
  generating: "Creando",
  "cinematic-reveal": "Reveal",
  checkout: "Checkout",
  library: "Biblioteca",
  "download-center": "Descargas",
  "create-another": "Nuevo",
};

export const EXPERIENCE_DRAFT_KEY = "metaprom_experience_v1_draft";
