import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { computeRankMap, resolveModelRecordKey } from '~/app/utilities/utils';
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
      (bestModelKey && resolveModelRecordKey(safeModels, bestModelKey)) ||
      (stageMapBestModel && resolveModelRecordKey(safeModels, stageMapBestModel));

    const selectedRecord = selectedModel ? safeModels[selectedModel] : undefined;
    const winnerModelLabel =
      selectedRecord != null && typeof selectedRecord.name === 'string'
        ? selectedRecord.name
        : undefined;
    const modelRanks = computeRankMap(safeModels, taskType ?? '', evalMetric, selectedModel);
    const modelKeysByName = new Map<string, string[]>();
    for (const [modelKey, model] of Object.entries(safeModels)) {
      if (model == null) {
        continue;
      }
      const modelName = model.name;
      if (typeof modelName === 'string' && modelName.trim().length > 0) {
        modelKeysByName.set(modelName, [...(modelKeysByName.get(modelName) ?? []), modelKey]);
      }
    }
    for (const [modelName, modelKeys] of modelKeysByName) {
      if (modelKeys.length === 1 && !Object.hasOwn(modelRanks, modelName)) {
        modelRanks[modelName] = modelRanks[modelKeys[0]];
      }
    }

    return {
      selectedModel,
      winnerModelLabel,
      stageMapNodes,
      modelRanks,
    };
  }, [models, stageMapNodes, bestModelKey, stageMapBestModel, taskType, evalMetric]);
