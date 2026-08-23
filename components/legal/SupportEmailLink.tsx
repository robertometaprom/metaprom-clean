import { PUBLIC_SUPPORT_EMAIL } from "@/lib/support/public";

type SupportEmailLinkProps = {
  className?: string;
};

export default function SupportEmailLink({
  className = "underline underline-offset-2 transition hover:text-white",
}: SupportEmailLinkProps) {
  return (
    <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}`} className={className}>
      {PUBLIC_SUPPORT_EMAIL}
    </a>
  );
}
