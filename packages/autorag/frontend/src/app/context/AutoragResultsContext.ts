import * as React from 'react';
import type { AutoragRuntimeParameters, LegacyRunCredentials, PipelineRun } from '~/app/types';
import { DEFAULT_OPTIMIZATION_METRIC } from '~/app/utilities/const';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { AutoragPattern, MetricReference } from '~/app/types/autoragPattern';
import {
  computePatternRankMap,
  getCompletePatternRankMap,
  resolveObjectiveReference,
} from '~/app/utilities/metricUtils';

export type AutoragResultsContextProps = {
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  patterns: Record<string, AutoragPattern>;
  patternsLoading?: boolean;
  patternsError?: boolean;
  patternsLoadError?: Error;
  onRetryPatterns?: () => Promise<void>;
  parameters?: AutoragRuntimeParameters;
  ragPatternsBasePath?: string;
  ogxCredentials?: LegacyRunCredentials;
  componentStageMap?: ComponentStageMap;
  componentStageMapLoading?: boolean;
  componentStageMapError?: boolean;
  optimizationMetric: MetricReference;
  /** Rank map keyed by the loaded pattern record key. */
  patternRankMap?: Record<string, number>;
  /** Record key with rank 1, when a rank exists. */
  rankOnePatternKey?: string;
  /** Whether the rank map came from a complete backend artifact rank set. */
  patternRanksAuthoritative?: boolean;
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
  onRetryPatterns?: () => Promise<void>;
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

  const patternRankMap = computePatternRankMap(patterns, optimizationMetric);
  const rankOnePatternKey = Object.keys(patternRankMap).find((key) => patternRankMap[key] === 1);
  const patternRanksAuthoritative = getCompletePatternRankMap(patterns) !== undefined;

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
    patternRankMap,
    rankOnePatternKey,
    patternRanksAuthoritative,
    optimizationMetric,
  };
}
