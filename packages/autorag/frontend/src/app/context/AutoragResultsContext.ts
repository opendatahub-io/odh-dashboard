import * as React from 'react';
import type { AutoragRuntimeParameters, LegacyRunCredentials, PipelineRun } from '~/app/types';
import { DEFAULT_OPTIMIZATION_METRIC } from '~/app/utilities/const';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { AutoragPattern, MetricReference } from '~/app/types/autoragPattern';
import { resolveBestPatternKey, resolveObjectiveReference } from '~/app/utilities/metricUtils';

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
  optimizationMetric: MetricReference;
  /**
   * Client-side winning pattern: the record key of the highest valid objective score.
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
  const runtimeObjective = parameters?.optimization_metric;
  const objectiveName =
    typeof runtimeObjective === 'string' ? runtimeObjective : DEFAULT_OPTIMIZATION_METRIC;
  const optimizationMetric = resolveObjectiveReference(patterns, objectiveName);

  const bestPatternKey = resolveBestPatternKey(patterns, optimizationMetric);

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
    optimizationMetric,
  };
}
