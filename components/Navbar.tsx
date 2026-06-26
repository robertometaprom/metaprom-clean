import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 z-50 w-full px-6 py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-[#F5F5F0] md:text-2xl"
        >
          Metaprom
        </Link>

        <AuthButton />
      </div>
    </nav>
  );
}
