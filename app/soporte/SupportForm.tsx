"use client";

import { useMemo, useState } from "react";
import type { Locale, Messages } from "@/lib/i18n";
import {
  MAX_SUPPORT_MESSAGE_LENGTH,
  MAX_SUPPORT_NAME_LENGTH,
  MIN_SUPPORT_MESSAGE_LENGTH,
  MIN_SUPPORT_NAME_LENGTH,
} from "@/lib/security/limits";
import {
  SUPPORT_API_PATH,
  SUPPORT_CATEGORY_IDS,
  SUPPORT_HONEYPOT_FIELD,
  isSupportCategoryId,
  isValidSupportEmail,
} from "@/lib/support/public";

type SupportFormProps = {
  locale: Locale;
  copy: Messages["support"];
};

type FormStatus = "idle" | "sending" | "success" | "invalid" | "rate_limited" | "error";

const inputClass =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/5 px-4 py-3 text-[#F5F5F0] outline-none transition placeholder:text-white/30 focus:border-white/40";

export default function SupportForm({ locale, copy }: SupportFormProps) {
  const requestId = useMemo(() => crypto.randomUUID(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  const statusMessage =
    status === "success"
      ? copy.success
      : status === "invalid"
        ? copy.invalid
        : status === "rate_limited"
          ? copy.rateLimited
          : status === "error"
            ? copy.error
            : null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || status === "success") return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const valid =
      trimmedName.length >= MIN_SUPPORT_NAME_LENGTH &&
      trimmedName.length <= MAX_SUPPORT_NAME_LENGTH &&
      isValidSupportEmail(trimmedEmail) &&
      isSupportCategoryId(category) &&
      trimmedMessage.length >= MIN_SUPPORT_MESSAGE_LENGTH &&
      trimmedMessage.length <= MAX_SUPPORT_MESSAGE_LENGTH;

    if (!valid) {
      setStatus("invalid");
      return;
    }

    setStatus("sending");

    try {
      const response = await fetch(SUPPORT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          category,
          message: trimmedMessage,
          locale,
          requestId,
          [SUPPORT_HONEYPOT_FIELD]: honeypot,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
      };

      if (response.ok && payload.ok === true) {
        setStatus("success");
        return;
      }

      if (response.status === 429 || payload.code === "rate_limited") {
        setStatus("rate_limited");
        return;
      }

      if (response.status === 400 || payload.code === "invalid") {
        setStatus("invalid");
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-sm border border-white/10 bg-white/5 px-5 py-6 text-base leading-relaxed text-[#F5F5F0]" role="status">
        {copy.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate>
      <label className="block text-sm text-white/70">
        {copy.name}
        <input
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={MAX_SUPPORT_NAME_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block text-sm text-white/70">
        {copy.email}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block text-sm text-white/70">
        {copy.category}
        <select
          name="category"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={inputClass}
        >
          <option value="">{copy.categoryPlaceholder}</option>
          {SUPPORT_CATEGORY_IDS.map((id) => (
            <option key={id} value={id} className="bg-black text-[#F5F5F0]">
              {copy.categories[id]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-white/70">
        {copy.message}
        <textarea
          name="message"
          required
          rows={6}
          maxLength={MAX_SUPPORT_MESSAGE_LENGTH}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${inputClass} min-h-40 resize-y`}
        />
      </label>

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label>
          website
          <input
            name={SUPPORT_HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      {statusMessage ? (
        <p className="text-sm text-red-300" role="alert">
          {statusMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-sm bg-[#F5F5F0] px-6 py-3 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? copy.sending : copy.send}
      </button>
    </form>
  );
}
