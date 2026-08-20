import LegalPage, { LegalSection } from "@/components/legal/LegalPage";
import SupportFormLink from "@/components/legal/SupportFormLink";
import type { Locale } from "@/lib/i18n";
import type { LegalBlock, LegalPolicyCopy } from "@/lib/legal/policies";

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-5">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "p-support") {
    return (
      <p>
        {block.before}
        <SupportFormLink>{block.link}</SupportFormLink>
        {block.after}
      </p>
    );
  }

  return <p>{block.text}</p>;
}

export default function LegalDocument({
  locale,
  copy,
}: {
  locale: Locale;
  copy: LegalPolicyCopy;
}) {
  return (
    <LegalPage
      locale={locale}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      updated={copy.updated}
      backHome={copy.backHome}
      updatedPrefix={copy.updatedPrefix}
    >
      {copy.sections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.blocks.map((block, index) => (
            <LegalBlockView key={`${section.title}-${index}`} block={block} />
          ))}
        </LegalSection>
      ))}
    </LegalPage>
  );
}
