import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { resolveModelDisplayName } from '~/app/utilities/utils';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import { RuntimeStateKF } from '~/app/types/pipeline';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoML results context data into tree view visualization data.
 *
 * When stage map topology nodes are provided, the tree renders the same nodes
 * as the experiment pipeline graph above it.
 */
export const useTreeViewData = (
  models: Record<string, AutomlModel>,
  runState?: string,
  stageMapNodes?: PipelineNodeModelExpanded[],
  bestModelKey?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    const modelNames = Object.keys(models);

    const pipelineModels = modelNames.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }));

    let visualRunState: PipelineVisualizationData['runState'];
    if (runState) {
      const upperState = runState.toUpperCase();
      if (upperState === RuntimeStateKF.SUCCEEDED) {
        visualRunState = 'completed';
      } else if (upperState === RuntimeStateKF.FAILED || upperState === RuntimeStateKF.CANCELED) {
        visualRunState = 'failed';
      } else if (
        upperState === RuntimeStateKF.RUNNING ||
        upperState === RuntimeStateKF.PENDING ||
        upperState === RuntimeStateKF.PAUSED
      ) {
        visualRunState = 'running';
      }
    }

    const selectedModelKey = bestModelKey ?? (modelNames.length > 0 ? modelNames[0] : undefined);
    const selectedModel = resolveModelDisplayName(models, selectedModelKey);

    return {
      models: pipelineModels,
      selectedModel,
      runState: visualRunState,
      stageMapNodes,
    };
  }, [models, runState, stageMapNodes, bestModelKey]);
