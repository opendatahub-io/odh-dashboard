import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { resolveModelDisplayName } from '~/app/utilities/utils';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoML results context data into tree view visualization data.
 */
export const useTreeViewData = (
  models: Record<string, AutomlModel>,
  stageMapNodes?: PipelineNodeModelExpanded[],
  bestModelKey?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const modelNames = Object.keys(models);
    const selectedModelKey = bestModelKey ?? (modelNames.length > 0 ? modelNames[0] : undefined);
    const selectedModel = resolveModelDisplayName(models, selectedModelKey);

    return {
      selectedModel,
      stageMapNodes,
    };
  }, [models, stageMapNodes, bestModelKey]);
