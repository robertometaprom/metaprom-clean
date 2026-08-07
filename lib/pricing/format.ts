export function formatPriceMxn(
  amount: number,
  locale: "en" | "es" = "es",
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  const maximumFractionDigits =
    options?.maximumFractionDigits ?? (Number.isInteger(amount) ? 0 : 2);
  const minimumFractionDigits =
    options?.minimumFractionDigits ?? (Number.isInteger(amount) ? 0 : 2);

  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}
