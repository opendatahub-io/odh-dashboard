import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import { findComponentTaskInRunDetails } from '~/app/hooks/useComponentStatuses';
import type { PipelineRun } from '~/app/types';
import { formatDurationBetween, formatMetricName } from '~/app/utilities/utils';
import type { StepDetail } from './stepMetadata';

const STAGE_DETAIL_EXCLUDED = new Set([
  'id',
  'description',
  'status',
  'timestamp',
  'steps',
  'display_name',
  'name',
  'component_id',
  'started_at',
  'completed_at',
  'pipeline_id',
  'kfp_run_id',
  'published_at',
  'metadata',
  'metrics',
  'outputs',
  'details',
]);

const NESTED_STAGE_FIELD_KEYS = ['metadata', 'metrics', 'outputs', 'details'] as const;

/* eslint-disable camelcase -- keys match backend stage field names */
const STAGE_FIELD_ORDER = [
  'train_rows',
  'test_rows',
  'row_count',
  'num_rows',
  'input_rows',
  'output_rows',
  'num_features',
  'feature_count',
  'top_n',
  'selected_models',
  'model_count',
  'eval_metric',
  'export_path',
  'output_path',
];

const STAGE_FIELD_LABELS: Record<string, string> = {
  train_rows: 'Training rows',
  test_rows: 'Test rows',
  row_count: 'Row count',
  num_rows: 'Row count',
  input_rows: 'Input rows',
  output_rows: 'Output rows',
  num_features: 'Feature count',
  feature_count: 'Feature count',
  top_n: 'Top models',
  selected_models: 'Selected models',
  model_count: 'Models refit',
  eval_metric: 'Evaluation metric',
  export_path: 'Export path',
  output_path: 'Output path',
};
/* eslint-enable camelcase */

export type ParsedStageMapNode =
  | { type: 'stage'; componentId: string; stageId: string }
  | { type: 'branch_step'; componentId: string; stepId: string; branchIndex: number }
  | { type: 'branch_model'; componentId: string; branchIndex: number };

export function parseStageMapNodeId(nodeId: string): ParsedStageMapNode | undefined {
  const parts = nodeId.split('__');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { type: 'stage', componentId: parts[0], stageId: parts[1] };
  }
  if (parts.length === 4 && parts[1] === 'step' && parts[2] && parts[3]?.startsWith('branch-')) {
    return {
      type: 'branch_step',
      componentId: parts[0],
      stepId: parts[2],
      branchIndex: Number(parts[3].replace('branch-', '')),
    };
  }
  if (parts.length === 3 && parts[1] === 'model' && parts[2]?.startsWith('branch-')) {
    return {
      type: 'branch_model',
      componentId: parts[0],
      branchIndex: Number(parts[2].replace('branch-', '')),
    };
  }
  return undefined;
}

function findComponent(
  stageMap: ComponentStageMap,
  componentId: string,
): ComponentStageMapComponent | undefined {
  return stageMap.components.find((component) => component.id === componentId);
}

function findStage(
  component: ComponentStageMapComponent,
  stageId: string,
): ComponentStageMapStage | undefined {
  return component.stages.find((stage) => stage.id === stageId);
}

function getStageIndex(component: ComponentStageMapComponent, stageId: string): number {
  return component.stages.findIndex((stage) => stage.id === stageId);
}

function getNextStage(
  component: ComponentStageMapComponent,
  stageId: string,
): ComponentStageMapStage | undefined {
  const index = getStageIndex(component, stageId);
  if (index < 0 || index >= component.stages.length - 1) {
    return undefined;
  }
  return component.stages[index + 1];
}

function getPreviousStage(
  component: ComponentStageMapComponent,
  stageId: string,
): ComponentStageMapStage | undefined {
  const index = getStageIndex(component, stageId);
  if (index <= 0) {
    return undefined;
  }
  return component.stages[index - 1];
}

function formatStageFieldLabel(key: string): string {
  return STAGE_FIELD_LABELS[key] ?? formatMetricName(key);
}

function formatStageFieldValue(key: string, value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (key === 'eval_metric' && typeof value === 'string') {
    return formatMetricName(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDisplayableStageField(key: string): boolean {
  return !STAGE_DETAIL_EXCLUDED.has(key);
}

const NESTED_STAGE_FIELD_KEY_SET = new Set<string>(NESTED_STAGE_FIELD_KEYS);

function flattenStageRecord(stage: ComponentStageMapStage): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(stage)) {
    if (NESTED_STAGE_FIELD_KEY_SET.has(key)) {
      if (isPlainObject(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (isDisplayableStageField(nestedKey) && nestedValue != null) {
            flattened[nestedKey] = nestedValue;
          }
        }
      }
      continue;
    }
    if (isDisplayableStageField(key) && value != null) {
      flattened[key] = value;
    }
  }

  return flattened;
}

function computeStageDuration(
  stage: ComponentStageMapStage,
  component: ComponentStageMapComponent,
  nextStage?: ComponentStageMapStage,
  previousStage?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
): string | undefined {
  const start = stage.timestamp ?? previousStage?.timestamp;
  if (start) {
    const end =
      nextStage?.timestamp ??
      (component.completed_at && stage.status === 'completed' ? component.completed_at : undefined);
    if (end) {
      return formatDurationBetween(start, end);
    }
  }

  if (!stage.timestamp && pipelineRun) {
    const task = findComponentTaskInRunDetails(
      pipelineRun.run_details?.task_details ?? [],
      component.id,
    );
    if (task && task.start_time && task.end_time) {
      return formatDurationBetween(task.start_time, task.end_time);
    }
  }

  return undefined;
}

function buildDetailsFromStageRecord(
  stage: ComponentStageMapStage,
  component: ComponentStageMapComponent,
  duration?: string,
): StepDetail[] {
  const details: StepDetail[] = [{ label: 'Duration', value: duration ?? '—' }];

  const flattened = flattenStageRecord(stage);
  const orderedKeys = [
    ...STAGE_FIELD_ORDER.filter((key) => flattened[key] != null),
    ...Object.keys(flattened)
      .filter((key) => !STAGE_FIELD_ORDER.includes(key))
      .toSorted(),
  ];

  for (const key of orderedKeys) {
    details.push({
      label: formatStageFieldLabel(key),
      value: formatStageFieldValue(key, flattened[key]),
    });
  }

  return details;
}

function findModelSelectionStage(
  component: ComponentStageMapComponent,
): ComponentStageMapStage | undefined {
  return component.stages.find((stage) => stage.id === 'model_selection');
}

function buildBranchStepDetails(
  component: ComponentStageMapComponent,
  branchIndex: number,
  modelSelection?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
): StepDetail[] {
  if (!modelSelection) {
    return [{ label: 'Duration', value: '—' }];
  }

  const nextStage = getNextStage(component, 'model_selection');
  const duration = computeStageDuration(
    modelSelection,
    component,
    nextStage,
    getPreviousStage(component, 'model_selection'),
    pipelineRun,
  );

  const details = buildDetailsFromStageRecord(modelSelection, component, duration).filter(
    (detail) => detail.label !== 'Selected models',
  );

  const selectedModels = modelSelection.selected_models;
  if (Array.isArray(selectedModels) && selectedModels[branchIndex] != null) {
    details.splice(1, 0, {
      label: 'Selected model',
      value: String(selectedModels[branchIndex]),
    });
  }

  return details;
}

export function getStageMapDetails(
  parsed: ParsedStageMapNode,
  componentStageMap: ComponentStageMap,
  pipelineRun?: PipelineRun,
  label?: string,
): StepDetail[] | undefined {
  const component = findComponent(componentStageMap, parsed.componentId);
  if (!component) {
    return undefined;
  }

  if (parsed.type === 'stage') {
    const stage = findStage(component, parsed.stageId);
    if (!stage) {
      return undefined;
    }
    const nextStage = getNextStage(component, parsed.stageId);
    const previousStage = getPreviousStage(component, parsed.stageId);
    const duration = computeStageDuration(stage, component, nextStage, previousStage, pipelineRun);
    return buildDetailsFromStageRecord(stage, component, duration);
  }

  const modelSelection = findModelSelectionStage(component);

  if (parsed.type === 'branch_step') {
    return buildBranchStepDetails(component, parsed.branchIndex, modelSelection, pipelineRun);
  }

  if (!modelSelection) {
    const details: StepDetail[] = [{ label: 'Duration', value: '—' }];
    if (label) {
      details.unshift({ label: 'Model', value: label });
    }
    return details;
  }

  return buildBranchStepDetails(component, parsed.branchIndex, modelSelection, pipelineRun).map(
    (detail) =>
      detail.label === 'Selected model' && label ? { label: 'Model', value: label } : detail,
  );
}

export function getStageDescriptionFromMap(
  parsed: ParsedStageMapNode,
  componentStageMap: ComponentStageMap,
): string | undefined {
  const component = findComponent(componentStageMap, parsed.componentId);
  if (!component || parsed.type !== 'stage') {
    return undefined;
  }
  return findStage(component, parsed.stageId)?.description;
}
