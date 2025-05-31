import {
  RunDateTime,
  RunFormData,
  RunTypeOption,
  SafeRunFormData,
  ScheduledType,
} from '#~/concepts/pipelines/content/createRun/types';
import { ParametersKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { getCorePipelineSpec } from '#~/concepts/pipelines/getCorePipelineSpec';
import { convertToDate } from '#~/utilities/time';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';

const runTypeSafeData = (runType: RunFormData['runType']): boolean =>
  runType.type !== RunTypeOption.SCHEDULED ||
  runType.data.triggerType !== ScheduledType.CRON ||
  !!runType.data.value;

export const isStartBeforeEnd = (start?: RunDateTime, end?: RunDateTime): boolean => {
  if (!start || !end) {
    return true;
  }
  const startDate = convertToDate(start);
  const endDate = convertToDate(end);
  return endDate.getTime() - startDate.getTime() > 0;
};

const isValidDate = (value?: RunDateTime): boolean => {
  if (!value) {
    return true;
  }
  const date = convertToDate(value);
  return date.toString() !== 'Invalid Date';
};

const runTypeSafeDates = (runType: RunFormData['runType']): boolean =>
  runType.type !== RunTypeOption.SCHEDULED ||
  (isValidDate(runType.data.start) &&
    isValidDate(runType.data.end) &&
    isStartBeforeEnd(runType.data.start, runType.data.end));

export const isFilledRunFormData = (formData: RunFormData): formData is SafeRunFormData => {
  const inputDefinitionParams = getInputDefinitionParams(formData.version);
  const hasRequiredInputParams = Object.entries(formData.params || {}).every(
    ([paramKey, paramValue]) =>
      inputDefinitionParams?.[paramKey]?.isOptional ||
      (paramValue !== undefined && paramValue !== ''),
  );

  return (
    !!formData.nameDesc.name &&
    !!formData.pipeline &&
    !!formData.version &&
    hasRequiredInputParams &&
    runTypeSafeData(formData.runType) &&
    runTypeSafeDates(formData.runType)
  );
};

export const getInputDefinitionParams = (
  version: PipelineVersionKF | null | undefined,
): ParametersKF | undefined => {
  // Return undefined for Argo workflow versions as they don't have root.inputDefinitions
  if (isArgoWorkflow(version?.pipeline_spec)) {
    return undefined;
  }
  return getCorePipelineSpec(version?.pipeline_spec)?.root.inputDefinitions?.parameters;
};
