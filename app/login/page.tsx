import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { getLocale, getMessages } from "@/lib/i18n";

export default async function LoginPage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-black text-white">
          <p className="text-white/60">{messages.auth.loading}</p>
        </main>
      }
    >
      <LoginForm locale={locale} nav={messages.nav} copy={messages.auth} />
    </Suspense>
  );
}
