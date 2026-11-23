import * as React from 'react';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { computePatternRankMap, type ObjectiveReference } from '~/app/utilities/metricUtils';
import { resolvePatternRecordKey } from '~/app/topology/stageMapStatus';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoRAG results context data into tree view visualization data.
 */
export const useTreeViewData = (
  patterns?: Record<string, AutoragPattern> | null,
  stageMapNodes?: PipelineNodeModelExpanded[],
  rankOnePatternKey?: string,
  optimizationMetric?: ObjectiveReference,
  providedPatternRanks?: Record<string, number>,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const safePatterns = patterns ?? {};
    const selectedPattern =
      rankOnePatternKey && resolvePatternRecordKey(safePatterns, rankOnePatternKey);
    const selectedRecord = selectedPattern ? safePatterns[selectedPattern] : undefined;
    const winnerPatternLabel =
      selectedRecord != null && typeof selectedRecord.name === 'string'
        ? selectedRecord.name
        : undefined;

    const rankablePatterns: Record<string, AutoragPattern> = {};
    for (const [key, pattern] of Object.entries(safePatterns)) {
      try {
        if (Array.isArray(pattern.evaluation.metrics)) {
          rankablePatterns[key] = pattern;
        }
      } catch {
        // Invalid hydrated pattern records are omitted from ranking.
      }
    }

    return {
      selectedPattern,
      winnerPatternLabel,
      stageMapNodes,
      patternRanks:
        providedPatternRanks ?? computePatternRankMap(rankablePatterns, optimizationMetric),
    };
  }, [patterns, stageMapNodes, rankOnePatternKey, optimizationMetric, providedPatternRanks]);
