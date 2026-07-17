import type { AutoragPattern, DetectedLanguageMetadata } from '~/app/types/autoragPattern';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isDetectedLanguageMetadata = (value: unknown): value is DetectedLanguageMetadata => {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.code === 'string' && typeof value.name === 'string';
};

/**
 * Returns detected language from the first RAG pattern that includes pipeline metadata.
 * Backend (pipelines-components PR #116) writes this to pattern.json under
 * settings.generation.detected_language.
 */
export const getDetectedLanguageFromPatterns = (
  patterns: Record<string, AutoragPattern>,
): DetectedLanguageMetadata | undefined => {
  for (const pattern of Object.values(patterns)) {
    const detectedLanguage = pattern.settings.generation.detected_language;
    if (isDetectedLanguageMetadata(detectedLanguage)) {
      return detectedLanguage;
    }
  }
  return undefined;
};
