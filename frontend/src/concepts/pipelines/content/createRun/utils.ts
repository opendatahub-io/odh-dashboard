import {
  RunDateTime,
  RunFormData,
  RunTypeOption,
  SafeRunFormData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';

const runTypeSafeData = (runType: RunFormData['runType']): boolean =>
  runType.type !== RunTypeOption.SCHEDULED ||
  runType.data.triggerType !== ScheduledType.CRON ||
  !!runType.data.value;

export const isStartBeforeEnd = (start?: RunDateTime, end?: RunDateTime): boolean => {
  if (!start || !end) {
    return true;
  }

  const startDate = new Date(`${start.date} ${start.time}`);
  const endDate = new Date(`${end.date} ${end.time}`);

  return endDate.getTime() - startDate.getTime() > 0;
};

const isValidDate = (value?: RunDateTime): boolean => {
  if (!value) {
    return true;
  }

  const date = new Date(`${value.date} ${value.time}`);
  return date.toString() !== 'Invalid Date';
};

const runTypeSafeDates = (runType: RunFormData['runType']): boolean =>
  runType.type !== RunTypeOption.SCHEDULED ||
  (isValidDate(runType.data.start) &&
    isValidDate(runType.data.end) &&
    isStartBeforeEnd(runType.data.start, runType.data.end));

export const isFilledRunFormData = (formData: RunFormData): formData is SafeRunFormData =>
  !!formData.nameDesc.name &&
  formData.pipelinesLoaded &&
  !!formData.pipeline &&
  !!formData.params &&
  runTypeSafeData(formData.runType) &&
  runTypeSafeDates(formData.runType);
