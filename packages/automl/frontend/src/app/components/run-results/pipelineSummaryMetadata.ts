import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { ComponentStageMap, ComponentStageMapStage } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import type { StepDetail } from '~/app/topology/tree-view/stepMetadata';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';
import {
  formatDurationBetween,
  formatMetricName,
  getBestModelFromStageMap,
  resolveBestModelKey,
  resolveEvalMetric,
  resolveModelDisplayName,
} from '~/app/utilities/utils';

const MODEL_SELECTION_STAGE_ID = 'model_selection';
const EVALUATE_MODELS_STAGE_ID = 'evaluate_models';

function findStageInMap(
  componentStageMap: ComponentStageMap | undefined,
  stageId: string,
): ComponentStageMapStage | undefined {
  if (!componentStageMap) {
    return undefined;
  }
  for (const component of componentStageMap.components) {
    const stage = component.stages.find((entry) => entry.id === stageId);
    if (stage) {
      return stage;
    }
  }
  return undefined;
}

function resolveModelsEvaluated(
  componentStageMap: ComponentStageMap | undefined,
  models: Record<string, AutomlModel>,
  parameters?: Partial<ConfigureSchema>,
): number | undefined {
  const modelSelection = findStageInMap(componentStageMap, MODEL_SELECTION_STAGE_ID);
  const selectedModels = modelSelection?.selected_models;
  if (Array.isArray(selectedModels) && selectedModels.length > 0) {
    return selectedModels.length;
  }

  const modelCount = Object.keys(models).length;
  if (modelCount > 0) {
    return modelCount;
  }

  if (typeof parameters?.top_n === 'number' && parameters.top_n > 0) {
    return parameters.top_n;
  }

  return undefined;
}

function resolveEvaluationMetricDisplay(
  componentStageMap: ComponentStageMap | undefined,
  parameters?: Partial<ConfigureSchema>,
): string | undefined {
  const taskType = parameters?.task_type ?? TASK_TYPE_TIMESERIES;
  const evaluateModels = findStageInMap(componentStageMap, EVALUATE_MODELS_STAGE_ID);
  const stageMetric =
    typeof evaluateModels?.eval_metric === 'string' ? evaluateModels.eval_metric : undefined;
  const metric = stageMetric ?? resolveEvalMetric(parameters?.eval_metric, taskType);
  return formatMetricName(metric);
}

function resolveTotalRunTime(pipelineRun?: PipelineRun): string | undefined {
  if (!pipelineRun) {
    return undefined;
  }
  return formatDurationBetween(pipelineRun.created_at, pipelineRun.finished_at);
}

function resolveWinningModelDisplay(
  models: Record<string, AutomlModel>,
  componentStageMap: ComponentStageMap | undefined,
): string | undefined {
  const bestModelKey = resolveBestModelKey(models, getBestModelFromStageMap(componentStageMap));
  return resolveModelDisplayName(models, bestModelKey);
}

/** Pipeline-level summary shown in the step drawer when no node is selected. */
export function getPipelineSummaryDetails(
  pipelineRun: PipelineRun | undefined,
  componentStageMap: ComponentStageMap | undefined,
  models: Record<string, AutomlModel>,
  parameters?: Partial<ConfigureSchema>,
): StepDetail[] {
  return [
    { label: 'Total run time', value: resolveTotalRunTime(pipelineRun) ?? '—' },
    {
      label: 'Models evaluated',
      value: resolveModelsEvaluated(componentStageMap, models, parameters)?.toString() ?? '—',
    },
    { label: 'Winning model', value: resolveWinningModelDisplay(models, componentStageMap) ?? '—' },
    {
      label: 'Evaluation metric',
      value: resolveEvaluationMetricDisplay(componentStageMap, parameters) ?? '—',
    },
  ];
}
