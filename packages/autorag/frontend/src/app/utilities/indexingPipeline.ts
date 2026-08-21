/* eslint-disable camelcase -- BFF indexing pipeline request uses snake_case field names */
import type { CreateIndexingPipelineRunRequest } from '~/app/types';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { MAX_DESCRIPTION_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '~/app/utilities/const';
import { formatPatternName } from '~/app/utilities/utils';

const unicodeLength = (value: string): number => Array.from(value).length;

const truncateUnicode = (value: string, maxLength: number): string => {
  const codePoints = Array.from(value);
  if (codePoints.length <= maxLength) {
    return value;
  }
  return codePoints.slice(0, maxLength).join('');
};

/**
 * Default display name for an indexing run started from an AutoRAG pattern.
 * Includes the source AutoRAG run name so concurrent Pattern N indexing runs
 * from different optimization runs stay distinguishable.
 */
export const defaultIndexingRunName = (patternName: string, sourceRunName?: string): string => {
  const patternLabel = formatPatternName(patternName);
  const trimmedSourceRunName = sourceRunName?.trim();
  const name = trimmedSourceRunName
    ? `Index build - ${trimmedSourceRunName} - ${patternLabel}`
    : `Index build - ${patternLabel}`;

  return truncateUnicode(name, MAX_DISPLAY_NAME_LENGTH);
};

export const patternHasIndexingPipelineSpec = (pattern: AutoragPattern | undefined): boolean => {
  const parameters = pattern?.indexing?.pipeline_spec?.parameters;
  return Boolean(parameters && Object.keys(parameters).length > 0);
};

/**
 * Builds an indexing create-run request from pattern.indexing.pipeline_spec.
 * Runtime parameters are owned by AutoRAG (pattern.json); the UI only supplies the run name
 * and optional description. overrides_allowed is reserved for a future override form.
 */
export const buildIndexingPipelineRunRequest = (
  pattern: AutoragPattern,
  displayName: string,
  description?: string,
): CreateIndexingPipelineRunRequest | { error: string } => {
  const pipelineSpec = pattern.indexing?.pipeline_spec;
  const parameters = pipelineSpec?.parameters;

  if (!pipelineSpec || !parameters || Object.keys(parameters).length === 0) {
    return {
      error:
        'This pattern does not include indexing.pipeline_spec parameters needed to run the indexing pipeline.',
    };
  }

  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return { error: 'A run name is required.' };
  }
  if (unicodeLength(trimmedName) > MAX_DISPLAY_NAME_LENGTH) {
    return {
      error: `Run name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    };
  }

  const trimmedDescription = description?.trim();
  if (trimmedDescription && unicodeLength(trimmedDescription) > MAX_DESCRIPTION_LENGTH) {
    return {
      error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  return {
    display_name: trimmedName,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    parameters,
  };
};
