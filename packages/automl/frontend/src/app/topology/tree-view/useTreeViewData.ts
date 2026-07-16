import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { resolveModelDisplayName } from '~/app/utilities/utils';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoML results context data into tree view visualization data.
 */
export const useTreeViewData = (
  models?: Record<string, AutomlModel> | null,
  stageMapNodes?: PipelineNodeModelExpanded[],
  bestModelKey?: string,
  stageMapBestModel?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const safeModels = models ?? {};
    const selectedModelKey =
      bestModelKey && Object.prototype.hasOwnProperty.call(safeModels, bestModelKey)
        ? bestModelKey
        : stageMapBestModel && Object.prototype.hasOwnProperty.call(safeModels, stageMapBestModel)
          ? stageMapBestModel
          : undefined;
    const selectedModel = selectedModelKey
      ? resolveModelDisplayName(safeModels, selectedModelKey)
      : undefined;

    return {
      selectedModel,
      stageMapNodes,
    };
  }, [models, stageMapNodes, bestModelKey, stageMapBestModel]);
