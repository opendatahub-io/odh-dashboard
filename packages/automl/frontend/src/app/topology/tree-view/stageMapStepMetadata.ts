import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import { findComponentTaskInRunDetails } from '~/app/hooks/useComponentStatuses';
import type { PipelineRun } from '~/app/types';
import {
  isAllowedFlattenKey,
  NESTED_STAGE_FIELD_KEY_SET,
  parseBranchIndexFromSuffix,
} from '~/app/topology/stageMapConstants';
import { formatDurationBetween, formatMetricName } from '~/app/utilities/utils';
import type { StepDetail } from './stepMetadata';

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
  best_model: 'Best model',
};

/** Fields to show with "—" when pending/failed/unreached and values are not yet on the stage record. */
const EXPECTED_STAGE_DETAIL_FIELDS: Partial<Record<string, readonly string[]>> = {
  read_and_sample: ['row_count'],
  cleanse: ['row_count'],
  split: ['train_rows', 'test_rows'],
  write_outputs: ['output_rows'],
  load_data: ['train_rows', 'test_rows'],
  model_selection: ['top_n'],
  refit_full: ['model_count'],
  evaluate_models: ['eval_metric'],
  build_leaderboard: ['best_model'],
  prepare_data: ['row_count'],
  split_and_export: ['train_rows', 'test_rows'],
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
  if (parts.length === 4 && parts[0] && parts[1] === 'step' && parts[2] && parts[3]) {
    const branchIndex = parseBranchIndexFromSuffix(parts[3]);
    if (branchIndex !== undefined) {
      return {
        type: 'branch_step',
        componentId: parts[0],
        stepId: parts[2],
        branchIndex,
      };
    }
  }
  if (parts.length === 3 && parts[0] && parts[1] === 'model' && parts[2]) {
    const branchIndex = parseBranchIndexFromSuffix(parts[2]);
    if (branchIndex !== undefined) {
      return {
        type: 'branch_model',
        componentId: parts[0],
        branchIndex,
      };
    }
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

function formatStageFieldLabel(key: string): string {
  return Object.hasOwn(STAGE_FIELD_LABELS, key) ? STAGE_FIELD_LABELS[key] : formatMetricName(key);
}

function isRenderablePrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isNonblankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatStageFieldValue(key: string, value: unknown): string {
  if (value == null || value === '') {
    return '—';
  }
  if (key === 'eval_metric' && typeof value === 'string') {
    return formatMetricName(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    if (key === 'selected_models') {
      return value.every(isNonblankString) ? value.join(', ') : '—';
    }
    return value.every(isRenderablePrimitive) ? value.join(', ') : '—';
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

function flattenStageRecord(stage: ComponentStageMapStage): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(stage)) {
    if (NESTED_STAGE_FIELD_KEY_SET.has(key)) {
      if (isPlainObject(value)) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (isAllowedFlattenKey(nestedKey) && nestedValue != null) {
            flattened[nestedKey] = nestedValue;
          }
        }
      }
      continue;
    }
    if (isAllowedFlattenKey(key) && value != null) {
      flattened[key] = value;
    }
  }

  return flattened;
}

type StepExecutionState = 'completed' | 'active' | 'pending' | 'failed' | 'unreached';

const shouldShowPlaceholderFields = (stepState?: StepExecutionState): boolean =>
  stepState === 'pending' || stepState === 'failed' || stepState === 'unreached';

const uniqueFieldKeys = (keys: string[]): string[] => {
  const seen = new Set<string>();
  return keys.filter((key) => {
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const resolveDetailFieldKeys = (
  flattened: Record<string, unknown>,
  stepState: StepExecutionState | undefined,
  stageId?: string,
): string[] => {
  const expectedKeys =
    stageId && Object.hasOwn(EXPECTED_STAGE_DETAIL_FIELDS, stageId)
      ? (EXPECTED_STAGE_DETAIL_FIELDS[stageId] ?? [])
      : [];
  const populatedKeys = Object.keys(flattened);

  if (!shouldShowPlaceholderFields(stepState)) {
    return uniqueFieldKeys([
      ...STAGE_FIELD_ORDER.filter((key) => flattened[key] != null),
      ...populatedKeys.filter((key) => !STAGE_FIELD_ORDER.includes(key)).toSorted(),
    ]);
  }

  return uniqueFieldKeys([
    ...STAGE_FIELD_ORDER.filter((key) => expectedKeys.includes(key) || flattened[key] != null),
    ...expectedKeys.filter((key) => !STAGE_FIELD_ORDER.includes(key)),
    ...populatedKeys
      .filter((key) => !STAGE_FIELD_ORDER.includes(key) && !expectedKeys.includes(key))
      .toSorted(),
  ]);
};

const hasStageExecutionEvidence = (
  stage: ComponentStageMapStage,
  stepState?: StepExecutionState,
): boolean =>
  stage.timestamp != null ||
  stage.status === 'started' ||
  stage.status === 'completed' ||
  stage.status === 'failed' ||
  stepState === 'failed' ||
  stepState === 'active' ||
  stepState === 'completed';

const getComponentTaskTimes = (
  component: ComponentStageMapComponent,
  pipelineRun?: PipelineRun,
): { start?: string; end?: string } | undefined => {
  const task = pipelineRun
    ? findComponentTaskInRunDetails(pipelineRun.run_details?.task_details ?? [], component.id)
    : undefined;

  const start = task?.start_time ?? component.started_at ?? task?.create_time;
  const end = task?.end_time ?? component.completed_at;

  if (start ?? end) {
    return { start, end };
  }

  return undefined;
};

const isTerminalStageState = (
  stage: ComponentStageMapStage,
  stepState?: StepExecutionState,
): boolean =>
  stage.status === 'completed' ||
  stage.status === 'failed' ||
  stepState === 'completed' ||
  stepState === 'failed';

const shouldUseTaskEndTime = (
  stage: ComponentStageMapStage,
  stepState?: StepExecutionState,
): boolean =>
  stage.status === 'failed' ||
  stage.status === 'started' ||
  stage.status === 'completed' ||
  stepState === 'failed' ||
  stepState === 'active' ||
  stepState === 'completed';

const resolveStageStartTime = (
  stage: ComponentStageMapStage,
  taskStart?: string,
  stepState?: StepExecutionState,
): string | undefined => {
  if (stage.timestamp) {
    return stage.timestamp;
  }
  if (
    stage.status === 'started' ||
    stage.status === 'failed' ||
    stage.status === 'completed' ||
    stepState === 'active' ||
    stepState === 'failed' ||
    stepState === 'completed'
  ) {
    return taskStart;
  }
  return undefined;
};

const resolveStageEndTime = (
  stage: ComponentStageMapStage,
  component: ComponentStageMapComponent,
  nextStage?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
  stepState?: StepExecutionState,
  taskEnd?: string,
): string | undefined => {
  if (nextStage?.timestamp) {
    return nextStage.timestamp;
  }

  if (isTerminalStageState(stage, stepState) && component.completed_at) {
    return component.completed_at;
  }

  if (shouldUseTaskEndTime(stage, stepState) && taskEnd) {
    return taskEnd;
  }

  if (stepState === 'failed' && pipelineRun?.finished_at) {
    return pipelineRun.finished_at;
  }

  return undefined;
};

function computeStageDuration(
  stage: ComponentStageMapStage,
  component: ComponentStageMapComponent,
  nextStage?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
  stepState?: StepExecutionState,
): string | undefined {
  if (!hasStageExecutionEvidence(stage, stepState)) {
    return undefined;
  }

  const taskTimes = getComponentTaskTimes(component, pipelineRun);
  const start = resolveStageStartTime(stage, taskTimes?.start, stepState);

  if (!start) {
    return undefined;
  }

  const end = resolveStageEndTime(
    stage,
    component,
    nextStage,
    pipelineRun,
    stepState,
    taskTimes?.end,
  );

  if (end) {
    return formatDurationBetween(start, end);
  }

  return undefined;
}

function buildDetailsFromStageRecord(
  stage: ComponentStageMapStage,
  duration?: string,
  stepState?: StepExecutionState,
  stageId?: string,
): StepDetail[] {
  const details: StepDetail[] = [{ label: 'Duration', value: duration ?? '—' }];

  const flattened = flattenStageRecord(stage);
  const orderedKeys = resolveDetailFieldKeys(flattened, stepState, stageId);

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
  return findStage(component, 'model_selection');
}

function buildBranchStepDetails(
  component: ComponentStageMapComponent,
  branchIndex: number,
  modelSelection?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
  stepState?: StepExecutionState,
): StepDetail[] {
  if (!modelSelection) {
    return [{ label: 'Duration', value: '—' }];
  }

  const nextStage = getNextStage(component, 'model_selection');
  const duration = computeStageDuration(
    modelSelection,
    component,
    nextStage,
    pipelineRun,
    stepState,
  );

  const details = buildDetailsFromStageRecord(
    modelSelection,
    duration,
    stepState,
    'model_selection',
  ).filter((detail) => detail.label !== 'Selected models');

  const selectedModels = modelSelection.selected_models;
  const selectedModelName =
    Array.isArray(selectedModels) && isNonblankString(selectedModels[branchIndex])
      ? selectedModels[branchIndex]
      : undefined;
  const modelDetail: StepDetail = {
    label: 'Selected model',
    value: selectedModelName ?? '—',
  };

  if (shouldShowPlaceholderFields(stepState) || selectedModelName != null) {
    details.splice(1, 0, modelDetail);
  }

  return details;
}

export function getStageMapDetails(
  parsed: ParsedStageMapNode,
  componentStageMap: ComponentStageMap,
  pipelineRun?: PipelineRun,
  label?: string,
  stepState?: StepExecutionState,
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
    const duration = computeStageDuration(stage, component, nextStage, pipelineRun, stepState);
    return buildDetailsFromStageRecord(stage, duration, stepState, parsed.stageId);
  }

  const modelSelection = findModelSelectionStage(component);

  if (parsed.type === 'branch_step') {
    return buildBranchStepDetails(
      component,
      parsed.branchIndex,
      modelSelection,
      pipelineRun,
      stepState,
    );
  }

  if (!modelSelection) {
    const details: StepDetail[] = [{ label: 'Duration', value: '—' }];
    if (label) {
      details.unshift({ label: 'Model', value: label });
    } else if (shouldShowPlaceholderFields(stepState)) {
      details.unshift({ label: 'Model', value: '—' });
    }
    return details;
  }

  const branchDetails = buildBranchStepDetails(
    component,
    parsed.branchIndex,
    modelSelection,
    pipelineRun,
    stepState,
  );

  const detailsWithModel =
    label && !branchDetails.some((detail) => detail.label === 'Selected model')
      ? [...branchDetails.slice(0, 1), { label: 'Model', value: label }, ...branchDetails.slice(1)]
      : branchDetails;

  return detailsWithModel.map((detail) =>
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
