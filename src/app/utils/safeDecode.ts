/**
 * Safe URI decoding utilities that prevent unhandled `URIError: URI malformed` crashes
 * caused by filenames or paths containing unescaped '%' characters (e.g. "Top 10% Moments.mp4").
 */

export function safeDecodeURIComponent(str: string | null | undefined): string {
  if (!str) return "";
  const s = String(str);
  try {
    return decodeURIComponent(s);
  } catch {
    try {
      return decodeURI(s);
    } catch {
      try {
        // Protect lone '%' not followed by 2 hex digits
        return decodeURIComponent(s.replace(/%(?![0-9a-fA-F]{2})/g, "%25"));
      } catch {
        return s;
      }
    }
  }
}

export function safeDecodeURI(str: string | null | undefined): string {
  return safeDecodeURIComponent(str);
}

export default safeDecodeURIComponent;
