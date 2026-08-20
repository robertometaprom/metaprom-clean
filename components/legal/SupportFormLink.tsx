import Link from "next/link";
import { SUPPORT_PATH } from "@/lib/support/public";

type SupportFormLinkProps = {
  children: React.ReactNode;
};

export default function SupportFormLink({ children }: SupportFormLinkProps) {
  return (
    <Link
      href={SUPPORT_PATH}
      className="underline underline-offset-2 transition hover:text-white"
    >
      {children}
    </Link>
  );
}
