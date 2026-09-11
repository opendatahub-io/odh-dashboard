import * as React from 'react';
import type { OgxCredentials, PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { resolveBestPatternKey } from '~/app/utilities/utils';

export type AutoragResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  patterns: Record<string, AutoragPattern>;
  patternsLoading?: boolean;
  patternsError?: boolean;
  patternsLoadError?: Error;
  onRetryPatterns?: () => void;
  parameters?: Partial<ConfigureSchema>;
  ragPatternsBasePath?: string;
  ogxCredentials?: OgxCredentials;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
  /**
   * Client-side winning pattern: the record key of the highest-`final_score` pattern.
   * AutoRAG has no backend `best_model`-equivalent field, so this is always derived from
   * loaded `patterns` (by record key, not display name) rather than the component stage map.
   */
  bestPatternKey?: string;
};

export const AutoragResultsContext = React.createContext<AutoragResultsContextProps | undefined>(
  undefined,
);

export const useAutoragResultsContext = (): AutoragResultsContextProps => {
  const context = React.useContext(AutoragResultsContext);
  if (!context) {
    throw new Error('useAutoragResultsContext must be used within AutoragResultsContext.Provider');
  }
  return context;
};

export function getAutoragContext({
  pipelineRun,
  patterns = {},
  pipelineRunLoading,
  patternsLoading,
  patternsError,
  patternsLoadError,
  onRetryPatterns,
  ragPatternsBasePath,
  ogxCredentials,
  componentStageMap,
  componentStageMapLoading,
  componentStageMapError,
}: {
  pipelineRun?: PipelineRun;
  patterns?: Record<string, AutoragPattern>;
  pipelineRunLoading?: boolean;
  patternsLoading?: boolean;
  patternsError?: boolean;
  patternsLoadError?: Error;
  onRetryPatterns?: () => void;
  ragPatternsBasePath?: string;
  ogxCredentials?: OgxCredentials;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
}): AutoragResultsContextProps {
  // Validate runtime_config.parameters against ConfigureSchema to ensure type safety
  const configureSchema = createConfigureSchema();
  const parseResult = configureSchema.base
    .partial()
    .safeParse(pipelineRun?.runtime_config?.parameters ?? {});

  let parameters: Partial<ConfigureSchema> = {};
  if (parseResult.success) {
    parameters = parseResult.data;
  } else {
    // eslint-disable-next-line no-console
    console.warn('Failed to parse pipeline runtime parameters:', parseResult.error);
  }

  const bestPatternKey = resolveBestPatternKey(patterns);

  return {
    pipelineRun,
    pipelineRunLoading,
    patterns,
    patternsLoading,
    patternsError,
    patternsLoadError,
    onRetryPatterns,
    parameters,
    ragPatternsBasePath,
    ogxCredentials,
    componentStageMap,
    componentStageMapLoading,
    componentStageMapError,
    bestPatternKey,
  };
}
