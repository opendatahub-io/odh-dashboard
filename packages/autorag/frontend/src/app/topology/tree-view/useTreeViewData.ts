import * as React from 'react';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { computePatternRankMap } from '~/app/utilities/metricUtils';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoRAG results context data into tree view visualization data.
 */
export const useTreeViewData = (
  patterns?: Record<string, AutoragPattern> | null,
  stageMapNodes?: PipelineNodeModelExpanded[],
  bestPatternKey?: string,
  stageMapBestPattern?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const safePatterns = patterns ?? {};
    const selectedPattern =
      bestPatternKey && Object.hasOwn(safePatterns, bestPatternKey)
        ? bestPatternKey
        : stageMapBestPattern && Object.hasOwn(safePatterns, stageMapBestPattern)
          ? stageMapBestPattern
          : undefined;
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
      patternRanks: computePatternRankMap(rankablePatterns),
    };
  }, [patterns, stageMapNodes, bestPatternKey, stageMapBestPattern]);
