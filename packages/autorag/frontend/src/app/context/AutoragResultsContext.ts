import * as React from 'react';
import type { AutoragRuntimeParameters, LegacyRunCredentials, PipelineRun } from '~/app/types';
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
  parameters?: AutoragRuntimeParameters;
  ragPatternsBasePath?: string;
  ogxCredentials?: LegacyRunCredentials;
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
  ogxCredentials?: LegacyRunCredentials;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
}): AutoragResultsContextProps {
  // Runtime parameters are historical data, not create-form input. Preserve unknown and legacy
  // fields so read-only results remain usable when the create schema evolves.
  const parameters = pipelineRun?.runtime_config?.parameters;

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
