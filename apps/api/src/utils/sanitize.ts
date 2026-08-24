// src/utils/sanitize.ts

/**
 * Enterprise-grade HTML and input sanitization utility.
 * Strips dangerous XSS vectors, scripts, iframes, malicious protocols,
 * and normalizes whitespace while preserving valid markdown/text formatting.
 */

const DANGEROUS_TAGS_REGEX = /<\s*(script|iframe|object|embed|style|meta|link|base|form|input|button|textarea|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|style|meta|link|base|form|input|button|textarea|svg|math)[^>]*\/?>/gi;
const DANGEROUS_ATTRIBUTES_REGEX = /\s*(on\w+|javascript:|vbscript:|data:text\/html|expression\s*\()[^=]*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const HTML_TAGS_REGEX = /<[^>]*>/g;
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitizes plain or rich text to prevent Stored XSS and payload bombs.
 * @param input Raw text string from user input
 * @param maxLength Maximum allowed length (defaults to 10,000)
 */
export function sanitizeMessageText(input?: string | null, maxLength = 10000): string {
  if (!input) return "";

  // 1. Convert to string
  let sanitized = String(input);

  // 2. Strip unprintable control characters (keep \t, \n, \r)
  sanitized = sanitized.replace(CONTROL_CHARS_REGEX, "");

  // 3. Strip dangerous script/iframe/object tags and their inner content
  sanitized = sanitized.replace(DANGEROUS_TAGS_REGEX, "");

  // 4. Strip inline event handlers (onload, onerror, onclick, etc.) and javascript: protocols
  sanitized = sanitized.replace(DANGEROUS_ATTRIBUTES_REGEX, "");

  // 5. Trim whitespace and enforce hard length boundary on sanitized content
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Strips all HTML tags completely for strict plain-text fields.
 */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  return String(input).replace(HTML_TAGS_REGEX, "").trim();
}

/**
 * Validates whether an attachment URL is safe and uses an allowed protocol.
 */
export function isSafeAttachmentUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();

  // Disallow javascript:, data:, vbscript:, and file: protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("file:")
  ) {
    return false;
  }

  // Allow relative URLs starting with / or absolute URLs starting with https:// or http://
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return true;
  }

  return false;
}
