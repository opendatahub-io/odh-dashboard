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
  'selected_patterns',
  'sampling_method',
  'pattern_count',
  'document_count',
  'row_count',
  'num_rows',
  'eval_metric',
  'export_path',
  'output_path',
  'best_pattern',
];

const STAGE_FIELD_LABELS: Record<string, string> = {
  selected_patterns: 'Selected patterns',
  sampling_method: 'Sampling method',
  pattern_count: 'Pattern count',
  document_count: 'Document count',
  row_count: 'Row count',
  num_rows: 'Row count',
  eval_metric: 'Evaluation metric',
  export_path: 'Export path',
  output_path: 'Output path',
  best_pattern: 'Best pattern',
};

/** Fields to show with "—" when pending/failed/unreached and values are not yet on the stage record. */
const EXPECTED_STAGE_DETAIL_FIELDS: Partial<Record<string, readonly string[]>> = {
  download_and_sample: ['row_count', 'document_count'],
  list_and_sample: ['document_count'],
  extract_documents: ['document_count'],
  prepare_data: ['sampling_method'],
  optimize_templates: ['selected_patterns'],
};
/* eslint-enable camelcase */

export type ParsedStageMapNode =
  | { type: 'stage'; componentId: string; stageId: string }
  | { type: 'branch_step'; componentId: string; stepId: string; branchIndex: number }
  | { type: 'branch_pattern'; componentId: string; branchIndex: number };

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
  if (parts.length === 3 && parts[0] && parts[1] === 'pattern' && parts[2]) {
    const branchIndex = parseBranchIndexFromSuffix(parts[2]);
    if (branchIndex !== undefined) {
      return {
        type: 'branch_pattern',
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
    if (key === 'selected_patterns') {
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

  // selected_patterns is excluded from generic flatten (topology/branch wiring reads it
  // directly), but the optimize_templates stage drawer must still show the full list.
  if (stage.selected_patterns != null) {
    flattened.selected_patterns = stage.selected_patterns; // eslint-disable-line camelcase
  } else if (isPlainObject(stage.metadata) && stage.metadata.selected_patterns != null) {
    flattened.selected_patterns = stage.metadata.selected_patterns; // eslint-disable-line camelcase
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

/**
 * AutoRAG stage `timestamp` values are completion times (unlike AutoML, where they behave as
 * stage starts). Prefer the previous stage's completion / component-or-task start as the
 * duration start, and this stage's timestamp as the end.
 */
const resolveStageStartTime = (
  previousStage: ComponentStageMapStage | undefined,
  taskStart?: string,
  stepState?: StepExecutionState,
  stage?: ComponentStageMapStage,
): string | undefined => {
  if (previousStage?.timestamp) {
    return previousStage.timestamp;
  }
  if (
    stage?.status === 'started' ||
    stage?.status === 'failed' ||
    stage?.status === 'completed' ||
    stepState === 'active' ||
    stepState === 'failed' ||
    stepState === 'completed' ||
    stage?.timestamp != null
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
  // AutoRAG publishes completion in `timestamp`; prefer that over the next stage.
  if (stage.timestamp) {
    return stage.timestamp;
  }

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
  previousStage?: ComponentStageMapStage,
  nextStage?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
  stepState?: StepExecutionState,
): string | undefined {
  if (!hasStageExecutionEvidence(stage, stepState)) {
    return undefined;
  }

  const taskTimes = getComponentTaskTimes(component, pipelineRun);
  const start = resolveStageStartTime(previousStage, taskTimes?.start, stepState, stage);

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

function findPatternSelectionStage(
  component: ComponentStageMapComponent,
): ComponentStageMapStage | undefined {
  return findStage(component, 'optimize_templates');
}

function buildBranchStepDetails(
  component: ComponentStageMapComponent,
  branchIndex: number,
  patternSelection?: ComponentStageMapStage,
  pipelineRun?: PipelineRun,
  stepState?: StepExecutionState,
): StepDetail[] {
  if (!patternSelection) {
    return [{ label: 'Duration', value: '—' }];
  }

  const previousStage = getPreviousStage(component, 'optimize_templates');
  const nextStage = getNextStage(component, 'optimize_templates');
  const duration = computeStageDuration(
    patternSelection,
    component,
    previousStage,
    nextStage,
    pipelineRun,
    stepState,
  );

  const details = buildDetailsFromStageRecord(
    patternSelection,
    duration,
    stepState,
    'optimize_templates',
  ).filter((detail) => detail.label !== 'Selected patterns');

  const selectedPatterns = flattenStageRecord(patternSelection).selected_patterns;
  const selectedPatternName =
    Array.isArray(selectedPatterns) && isNonblankString(selectedPatterns[branchIndex])
      ? selectedPatterns[branchIndex]
      : undefined;
  const patternDetail: StepDetail = {
    label: 'Selected pattern',
    value: selectedPatternName ?? '—',
  };

  if (shouldShowPlaceholderFields(stepState) || selectedPatternName != null) {
    details.splice(1, 0, patternDetail);
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
    const previousStage = getPreviousStage(component, parsed.stageId);
    const nextStage = getNextStage(component, parsed.stageId);
    const duration = computeStageDuration(
      stage,
      component,
      previousStage,
      nextStage,
      pipelineRun,
      stepState,
    );
    return buildDetailsFromStageRecord(stage, duration, stepState, parsed.stageId);
  }

  const patternSelection = findPatternSelectionStage(component);

  if (parsed.type === 'branch_step') {
    return buildBranchStepDetails(
      component,
      parsed.branchIndex,
      patternSelection,
      pipelineRun,
      stepState,
    );
  }

  if (!patternSelection) {
    const details: StepDetail[] = [{ label: 'Duration', value: '—' }];
    if (label) {
      details.unshift({ label: 'Pattern', value: label });
    } else if (shouldShowPlaceholderFields(stepState)) {
      details.unshift({ label: 'Pattern', value: '—' });
    }
    return details;
  }

  const branchDetails = buildBranchStepDetails(
    component,
    parsed.branchIndex,
    patternSelection,
    pipelineRun,
    stepState,
  );

  const detailsWithPattern =
    label && !branchDetails.some((detail) => detail.label === 'Selected pattern')
      ? [
          ...branchDetails.slice(0, 1),
          { label: 'Pattern', value: label },
          ...branchDetails.slice(1),
        ]
      : branchDetails;

  return detailsWithPattern.map((detail) =>
    detail.label === 'Selected pattern' && label ? { label: 'Pattern', value: label } : detail,
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
