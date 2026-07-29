import * as React from 'react';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
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

    return {
      selectedPattern,
      stageMapNodes,
    };
  }, [patterns, stageMapNodes, bestPatternKey, stageMapBestPattern]);
