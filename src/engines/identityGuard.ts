/**
 * Sanitizes model output and transcripts to ensure ARORA AI maintains a consistent
 * independent identity and never leaks underlying model/provider names.
 */
export function sanitizeAroraOutput(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(i am|i'm|this is)\s+gemini\b/gi, '$1 ARORA AI')
    .replace(/\b(trained|created|developed|built|made)\s+by\s+google(\s+deepmind|\s+ai)?\b/gi, 'engineered for ARORA AI')
    .replace(/\bgoogle\s+(deepmind|ai\s+studio|ai|gemini)\b/gi, 'ARORA AI')
    .replace(/\bgemini(\s+[0-9]+(?:\.[0-9]+)?(?:\s+(?:pro|flash|ultra|lite|live|nano|advanced|hydrogen))*)?\b/gi, 'ARORA AI')
    .replace(/\bdeepmind\b/gi, 'ARORA Research')
    .replace(/\bgoogle\s+bard\b/gi, 'ARORA AI');
}
