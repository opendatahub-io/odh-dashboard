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
    const safeModels: Record<string, AutomlModel | null | undefined> = models ?? {};
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
    const modelRanks = computeRankMap(safeModels, taskType ?? '', evalMetric, selectedModel);
    for (const [modelKey, model] of Object.entries(safeModels)) {
      if (model == null) {
        continue;
      }
      const modelName = model.name;
      if (
        typeof modelName === 'string' &&
        modelName.trim().length > 0 &&
        !Object.hasOwn(modelRanks, modelName)
      ) {
        modelRanks[modelName] = modelRanks[modelKey];
      }
    }

    return {
      selectedModel,
      winnerModelLabel,
      stageMapNodes,
      modelRanks,
    };
  }, [models, stageMapNodes, bestModelKey, stageMapBestModel, taskType, evalMetric]);
