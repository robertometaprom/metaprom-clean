import {
  ACQUISITION_COOKIE_MAX_AGE_SECONDS,
  ACQUISITION_COOKIE_NAME,
  generateVisitorId,
  isVisitorId,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
  VISITOR_COOKIE_NAME,
  VISITOR_LOCAL_STORAGE_KEY,
} from "@/lib/analytics/ids";

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const parts = document.cookie.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    if (key !== name) {
      continue;
    }
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }

  return null;
}

function writeBrowserCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") {
    return;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function readLocalVisitorId(): string | null {
  try {
    const value = window.localStorage.getItem(VISITOR_LOCAL_STORAGE_KEY);
    return isVisitorId(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLocalVisitorId(value: string) {
  try {
    window.localStorage.setItem(VISITOR_LOCAL_STORAGE_KEY, value);
  } catch {
    // Private mode.
  }
}

/**
 * Resolve or mint the first-party visitor id. Prefers the middleware cookie,
 * then localStorage, then a new random UUID written to both.
 */
export function getOrCreateVisitorId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromCookie = readBrowserCookie(VISITOR_COOKIE_NAME);
  if (isVisitorId(fromCookie)) {
    writeLocalVisitorId(fromCookie);
    return fromCookie;
  }

  const fromStorage = readLocalVisitorId();
  if (fromStorage) {
    writeBrowserCookie(
      VISITOR_COOKIE_NAME,
      fromStorage,
      VISITOR_COOKIE_MAX_AGE_SECONDS,
    );
    return fromStorage;
  }

  const created = generateVisitorId();
  writeBrowserCookie(
    VISITOR_COOKIE_NAME,
    created,
    VISITOR_COOKIE_MAX_AGE_SECONDS,
  );
  writeLocalVisitorId(created);
  return created;
}

export function readAcquisitionCookieRaw(): string | null {
  return readBrowserCookie(ACQUISITION_COOKIE_NAME);
}

export function persistAcquisitionCookieRaw(value: string) {
  writeBrowserCookie(
    ACQUISITION_COOKIE_NAME,
    value,
    ACQUISITION_COOKIE_MAX_AGE_SECONDS,
  );
}
