const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });

/**
 * Converts an ISO 639-1 language code (e.g. "de") to a display name (e.g. "German").
 * Falls back to the raw code when the code is unknown or invalid.
 */
export const getLanguageDisplayName = (languageCode: string): string => {
  const normalized = languageCode.trim().toLowerCase();
  if (!normalized) {
    return languageCode;
  }
  try {
    return languageDisplayNames.of(normalized) ?? languageCode;
  } catch {
    return languageCode;
  }
};

/**
 * Normalizes a confidence value to a whole-number percentage (0–100).
 * Accepts fractions (0–1) or percentages (1–100).
 */
export const normalizeLanguageConfidencePercent = (confidence: number): number => {
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.round(confidence);
};

type FormatDetectedLanguageOptions = {
  languageCode: string;
  confidence?: number;
};

/**
 * Formats detected language metadata for display in run details.
 * Example: "German (94% confidence)"
 */
export const formatDetectedLanguage = ({
  languageCode,
  confidence,
}: FormatDetectedLanguageOptions): string => {
  const displayName = getLanguageDisplayName(languageCode);
  if (confidence == null || Number.isNaN(confidence)) {
    return displayName;
  }
  return `${displayName} (${normalizeLanguageConfidencePercent(confidence)}% confidence)`;
};

/**
 * Formats language metadata from the AutoRAG pipeline (pipelines-components).
 * Shape: { code: "de", name: "German" } — no confidence field.
 */
export const formatDetectedLanguageMetadata = (
  metadata: { code?: string; name?: string },
  confidence?: number,
): string => {
  const name = metadata.name?.trim();
  const code = metadata.code?.trim();
  const displayName = name || (code ? getLanguageDisplayName(code) : '');
  if (!displayName) {
    return '-';
  }
  if (confidence == null || Number.isNaN(confidence)) {
    return displayName;
  }
  return `${displayName} (${normalizeLanguageConfidencePercent(confidence)}% confidence)`;
};
