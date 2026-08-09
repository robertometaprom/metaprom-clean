import WhatsAppHandoffClient from "@/components/share/WhatsAppHandoffClient";

type PageProps = {
  params: Promise<{ share_slug: string }>;
};

export default async function WhatsAppHandoffPage({ params }: PageProps) {
  const { share_slug: shareSlug } = await params;
  return <WhatsAppHandoffClient shareSlug={shareSlug} />;
}
