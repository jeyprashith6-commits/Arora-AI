import { sanitizeAroraOutput } from './identityGuard.ts';

const FORBIDDEN_TAG_BLOCK_REGEX =
  /<\s*(script|foreignObject|iframe|object|embed|audio|video|applet|form|input|textarea|button)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const FORBIDDEN_SELF_CLOSING_REGEX =
  /<\s*(script|foreignObject|iframe|object|embed|link|meta|base|input|image)\b[^>]*\/?>/gi;

const VECTOR_PRIMITIVE_REGEX =
  /<\s*(path|line|rect|circle|ellipse|polygon|polyline)\b/i;

/**
 * Sanitizes an AI-synthesized vector SVG so it cannot inject scripts, event handlers,
 * external URLs, or model-identity text, while guaranteeing responsive viewBox scaling.
 */
export function sanitizeSvgMarkup(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  // Strip surrounding markdown code fences if present
  const unwrapped = rawSvg
    .replace(/^```(?:svg|xml|html)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const match = unwrapped.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (!match) return '';

  let svg = match[0];

  // Remove dangerous elements and self-closing tags
  svg = svg
    .replace(FORBIDDEN_TAG_BLOCK_REGEX, '')
    .replace(FORBIDDEN_SELF_CLOSING_REGEX, '')
    // Remove inline event handlers (onclick, onload, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Neutralize javascript:/vbscript:/data:text/html URIs in href or xlink:href
    .replace(
      /\s+(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi,
      '',
    )
    // Remove CSS url(http...) or expression(...)
    .replace(/url\s*\(\s*['"]?\s*https?:[^)]+\)/gi, 'none')
    .replace(/expression\s*\([^)]*\)/gi, '');

  // Ensure root <svg> has xmlns, responsive viewBox, and no fixed clipping pixel width/height
  svg = svg.replace(/<svg\b([^>]*)>/i, (_full, rawAttrs: string) => {
    let attrs = rawAttrs
      .replace(/\s+(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
      .trim();

    if (!/\bxmlns\s*=/i.test(attrs)) {
      attrs = `xmlns="http://www.w3.org/2000/svg" ${attrs}`;
    }

    const viewBoxMatch = attrs.match(
      /\bviewBox\s*=\s*["']\s*([-\d.]+[\s,]+[-\d.]+[\s,]+[\d.]+[\s,]+[\d.]+)\s*["']/i,
    );
    if (!viewBoxMatch) {
      attrs = `${attrs} viewBox="0 0 800 480"`;
    }

    if (!/\bpreserveAspectRatio\s*=/i.test(attrs)) {
      attrs = `${attrs} preserveAspectRatio="xMidYMid meet"`;
    }

    if (!/\brole\s*=/i.test(attrs)) {
      attrs = `${attrs} role="img"`;
    }

    return `<svg ${attrs.trim()}>`;
  });

  // Sanitize any identity leaks inside SVG text/title/desc elements
  svg = svg.replace(
    /(<\s*(?:text|tspan|title|desc)\b[^>]*>)([\s\S]*?)(<\s*\/\s*(?:text|tspan|title|desc)\s*>)/gi,
    (_all, open: string, inner: string, close: string) =>
      `${open}${sanitizeAroraOutput(inner)}${close}`,
  );

  // Must actually contain drawn vector geometry
  if (!VECTOR_PRIMITIVE_REGEX.test(svg)) {
    return '';
  }

  return svg;
}

const STRONG_DIAGRAM_REGEX =
  /\b(ray\s+diagram|circuit\s+diagram|block\s+diagram|energy\s+level\s+diagram|phasor\s+diagram|phase\s+diagram|molecular\s+orbital\s+diagram|venn\s+diagram|flow\s*chart|labelled\s+diagram|labeled\s+diagram|neat\s+diagram|schematic\s+diagram|diagram|schematic|illustration|sketch)\b/i;

const VISUAL_VERB_WITH_SUBJECT_REGEX =
  /\b(draw|sketch|illustrate|depict|plot|graph|visualize|visualise|diagram)\b(?:\s+(?:a|an|the|neat|clean|labelled|labeled|proper|well[- ]labelled))*\s+(?:of\s+)?([a-z0-9α-ωΑ-Ω°′″+−*/^().'\-\s]{3,90})/i;

const STRUCTURE_OF_REGEX =
  /\b(?:structure|anatomy|cross[- ]section|internal\s+view|working\s+model|apparatus|setup|mechanism\s+diagram|setup\s+diagram)\s+of\s+(?:a|an|the)?\s*([a-z0-9α-ωΑ-Ω°′″+−*/^().'\-\s]{3,80})/i;

const DIAGRAM_FALSE_POSITIVE_REGEX =
  /\b(drawback|draw\s+conclusion|draw\s+a\s+conclusion|withdraw|drawn\s+from|structure\s+of\s+(?:the\s+)?(?:answer|essay|letter|code|program|table|database|sentence|paragraph)|data\s+structure)\b/i;

/**
 * Detects whether a student's message asks for a visual diagram and extracts a clean topic name.
 */
export function detectDiagramRequest(prompt: string): {
  wantsDiagram: boolean;
  cleanTopic: string;
} {
  const trimmed = prompt.trim();
  if (!trimmed || trimmed.length < 4) {
    return { wantsDiagram: false, cleanTopic: '' };
  }

  const hasExplicitDiagramKeyword = STRONG_DIAGRAM_REGEX.test(trimmed);
  const hasVisualVerb = VISUAL_VERB_WITH_SUBJECT_REGEX.test(trimmed);
  const hasBioOrApparatusStructure = STRUCTURE_OF_REGEX.test(trimmed);

  if (
    !hasExplicitDiagramKeyword &&
    !hasVisualVerb &&
    !hasBioOrApparatusStructure
  ) {
    return { wantsDiagram: false, cleanTopic: '' };
  }

  if (
    !hasExplicitDiagramKeyword &&
    DIAGRAM_FALSE_POSITIVE_REGEX.test(trimmed)
  ) {
    return { wantsDiagram: false, cleanTopic: '' };
  }

  // Clean natural conversational wrappers to isolate the diagram subject cleanly
  let topic = trimmed
    .replace(
      /^(?:please\s+|can\s+you\s+|could\s+you\s+|kindly\s+|hey\s+arora\s*,?\s*|arora\s*,?\s*)+/i,
      '',
    )
    .replace(
      /^(?:draw|sketch|illustrate|generate|make|create|show(?:\s+me)?|give(?:\s+me)?|provide|explain\s+with)\s+(?:a|an|the)?\s*(?:neat|clean|clear|well[- ]labelled|well[- ]labeled|labelled|labeled|detailed|perfect)?\s*/i,
      '',
    )
    .replace(
      /^(?:labelled|labeled|neat|clean|schematic)?\s*(?:ray\s+|circuit\s+|block\s+|phasor\s+|energy[- ]level\s+)?(?:diagram|schematic|flowchart|sketch|illustration|figure|plot)\s+(?:of|for|showing)\s+/i,
      '',
    )
    .replace(
      /\s+(?:with\s+(?:proper\s+)?labels?|with\s+explanation|and\s+explain(?:\s+it)?|step\s+by\s+step|in\s+detail|clearly|neatly)[.?!]*$/i,
      '',
    )
    .replace(/[.?!]+$/, '')
    .trim();

  if (!topic || topic.length < 3) {
    topic = trimmed.slice(0, 100);
  }

  return {
    wantsDiagram: true,
    cleanTopic: topic.slice(0, 140),
  };
}
