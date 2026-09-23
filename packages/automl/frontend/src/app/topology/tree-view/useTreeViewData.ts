import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { computeRankMap } from '~/app/utilities/utils';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoML results context data into tree view visualization data.
 */
export const useTreeViewData = (
  models?: Record<string, AutomlModel> | null,
  stageMapNodes?: PipelineNodeModelExpanded[],
  bestModelKey?: string,
  stageMapBestModel?: string,
  taskType?: string,
  evalMetric?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const safeModels = models ?? {};
    const selectedModel =
      bestModelKey && Object.hasOwn(safeModels, bestModelKey)
        ? bestModelKey
        : stageMapBestModel && Object.hasOwn(safeModels, stageMapBestModel)
          ? stageMapBestModel
          : undefined;

    const selectedRecord = selectedModel ? safeModels[selectedModel] : undefined;
    const winnerModelLabel =
      selectedRecord != null && typeof selectedRecord.name === 'string'
        ? selectedRecord.name
        : undefined;

    return {
      selectedModel,
      winnerModelLabel,
      stageMapNodes,
      modelRanks: computeRankMap(safeModels, taskType ?? '', evalMetric, selectedModel),
    };
  }, [models, stageMapNodes, bestModelKey, stageMapBestModel, taskType, evalMetric]);
