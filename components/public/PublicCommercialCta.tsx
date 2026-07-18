import Link from "next/link";

type PublicCommercialCtaProps = {
  label: string;
  href: string;
};

export default function PublicCommercialCta({
  label,
  href,
}: PublicCommercialCtaProps) {
  return (
    <section className="py-2">
      <Link
        href={href}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#F5F5F0] px-6 text-sm font-semibold text-black transition hover:bg-white md:w-auto md:min-w-52"
      >
        {label}
      </Link>
    </section>
  );
}
