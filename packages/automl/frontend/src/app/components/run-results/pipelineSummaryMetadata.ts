import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { ComponentStageMap, ComponentStageMapStage } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { dedupePreservingOrder } from '~/app/topology/stageMapConstants';
import type { StepDetail } from '~/app/topology/tree-view/stepMetadata';
import {
  formatDurationBetween,
  formatMetricName,
  computeRankMap,
  getBestModelFromStageMap,
  resolveBestModelKey,
  resolveEvalMetric,
  resolveModelDisplayName,
} from '~/app/utilities/utils';

const MODEL_SELECTION_STAGE_ID = 'model_selection';
const EVALUATE_MODELS_STAGE_ID = 'evaluate_models';

function isStageNestedRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentStageMapStage(value: unknown): value is ComponentStageMapStage {
  return (
    isStageNestedRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.description === 'string'
  );
}

function findStageInMap(
  componentStageMap: ComponentStageMap | undefined,
  stageId: string,
): ComponentStageMapStage | undefined {
  if (!componentStageMap) {
    return undefined;
  }

  const components = Array.isArray(componentStageMap.components)
    ? componentStageMap.components.filter(isStageNestedRecord)
    : [];

  for (const component of components) {
    const stages = Array.isArray(component.stages)
      ? component.stages.filter(isComponentStageMapStage)
      : [];
    const stage = stages.find((entry) => entry.id === stageId);
    if (stage) {
      return stage;
    }
  }
  return undefined;
}

function resolveModelsEvaluated(
  componentStageMap: ComponentStageMap | undefined,
  models: Record<string, AutomlModel>,
): number | undefined {
  const modelSelection = findStageInMap(componentStageMap, MODEL_SELECTION_STAGE_ID);
  const selectedModels = modelSelection?.selected_models;
  if (Array.isArray(selectedModels)) {
    const uniqueValidModels = dedupePreservingOrder(
      selectedModels.filter((item): item is string => typeof item === 'string' && item.length > 0),
    );
    if (uniqueValidModels.length > 0) {
      return uniqueValidModels.length;
    }
  }

  const modelCount = Object.keys(models).length;
  if (modelCount > 0) {
    return modelCount;
  }

  return undefined;
}

function resolveEvaluationMetricDisplay(
  componentStageMap: ComponentStageMap | undefined,
  parameters?: Partial<ConfigureSchema>,
): string | undefined {
  const evaluateModels = findStageInMap(componentStageMap, EVALUATE_MODELS_STAGE_ID);
  const stageMetric =
    typeof evaluateModels?.eval_metric === 'string' ? evaluateModels.eval_metric.trim() : undefined;

  if (stageMetric) {
    return formatMetricName(stageMetric);
  }

  if (parameters?.eval_metric) {
    return formatMetricName(resolveEvalMetric(parameters.eval_metric, parameters.task_type ?? ''));
  }

  if (parameters?.task_type) {
    return formatMetricName(resolveEvalMetric(undefined, parameters.task_type));
  }

  return undefined;
}

function resolveTotalRunTime(pipelineRun?: PipelineRun): string | undefined {
  if (!pipelineRun) {
    return undefined;
  }
  return formatDurationBetween(pipelineRun.created_at, pipelineRun.finished_at);
}

function resolveWinningModelFromModels(
  models: Record<string, AutomlModel>,
  parameters?: Partial<ConfigureSchema>,
): string | undefined {
  const modelKeys = Object.keys(models);
  if (modelKeys.length === 0 || !parameters?.task_type) {
    return undefined;
  }

  const rankMap = computeRankMap(models, parameters.task_type, parameters.eval_metric);
  const rankOneKey = modelKeys.find((key) => rankMap[key] === 1);
  return resolveModelDisplayName(models, rankOneKey);
}

function resolveWinningModelDisplay(
  models: Record<string, AutomlModel>,
  componentStageMap: ComponentStageMap | undefined,
  parameters?: Partial<ConfigureSchema>,
): string | undefined {
  const bestModel = getBestModelFromStageMap(componentStageMap);
  if (bestModel) {
    const bestModelKey = resolveBestModelKey(models, bestModel);
    return resolveModelDisplayName(models, bestModelKey) ?? bestModel;
  }

  return resolveWinningModelFromModels(models, parameters);
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
      value: resolveModelsEvaluated(componentStageMap, models)?.toString() ?? '—',
    },
    {
      label: 'Winning model',
      value: resolveWinningModelDisplay(models, componentStageMap, parameters) ?? '—',
    },
    {
      label: 'Evaluation metric',
      value: resolveEvaluationMetricDisplay(componentStageMap, parameters) ?? '—',
    },
  ];
}
