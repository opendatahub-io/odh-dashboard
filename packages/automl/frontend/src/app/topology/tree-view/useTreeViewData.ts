import * as React from 'react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import { RuntimeStateKF } from '~/app/types/pipeline';
import type { PipelineVisualizationData } from './types';

/**
 * Converts AutoML results context data into tree view visualization data.
 *
 * Maps the simplified pipeline view data to the detailed tree view:
 * - "Input data loader" → Read dataset, Split holdout data, Read training data, Preprocessing, Model selection
 * - "Model generation" (per model) → [Model Name], Hyperparameter optimization, Feature engineering,
 *   Hyperparameter optimization, Ensemble creation
 * - Final → Model evaluation, Select best model
 */
export const useTreeViewData = (
  models: Record<string, AutomlModel>,
  runState?: string,
): PipelineVisualizationData =>
  React.useMemo(() => {
    // Extract model names from the models record
    const modelNames = Object.keys(models);

    // Convert to PipelineModelData format
    const pipelineModels = modelNames.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
    }));

    // Determine run state for visualization based on actual pipeline state
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

    // Find the best model (first one in the sorted list, if any)
    // The models are typically sorted by performance in the leaderboard
    const selectedModel = modelNames.length > 0 ? modelNames[0] : undefined;

    return {
      models: pipelineModels,
      selectedModel,
      runState: visualRunState,
    };
  }, [models, runState]);
