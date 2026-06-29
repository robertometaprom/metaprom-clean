import ExperienceFlow from "@/components/experience/ExperienceFlow";
import { getLandingContent } from "@/lib/i18n";

export const metadata = {
  title: "Metaprom Experience v1",
  description:
    "Interactive prototype — complete commercial journey from landing to download.",
};

export default async function ExperiencePage() {
  const content = await getLandingContent();

  return <ExperienceFlow content={content} />;
}
