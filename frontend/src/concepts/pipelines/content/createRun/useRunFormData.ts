import * as React from 'react';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  RunDateTime,
  RunFormData,
  RunType,
  RunTypeOption,
  ScheduledType,
  RunParam,
} from '~/concepts/pipelines/content/createRun/types';
import {
  DateTimeKF,
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineVersionKF,
} from '~/concepts/pipelines/kfTypes';

import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_PERIODIC_OPTION,
  DEFAULT_TIME,
} from '~/concepts/pipelines/content/createRun/const';
import { convertDateToTimeString, convertSecondsToPeriodicTime } from '~/utilities/time';
import { isPipelineRunJob } from '~/concepts/pipelines/content/utils';

const parseKFTime = (kfTime?: DateTimeKF): RunDateTime | undefined => {
  if (!kfTime) {
    return undefined;
  }
  const [date] = kfTime.split('T');
  const time = convertDateToTimeString(new Date(kfTime));

  return { date, time: time ?? DEFAULT_TIME };
};

const useUpdateRunType = (
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  initialData?: PipelineRunKF | PipelineRunJobKF,
): void => {
  React.useEffect(() => {
    if (!isPipelineRunJob(initialData)) {
      return;
    }

    const { trigger } = initialData;
    let triggerType: ScheduledType;
    let start: RunDateTime | undefined;
    let end: RunDateTime | undefined;
    let value: string;
    if (trigger.cron_schedule) {
      triggerType = ScheduledType.CRON;
      value = trigger.cron_schedule.cron || DEFAULT_CRON_STRING;
      start = parseKFTime(trigger.cron_schedule.start_time);
      end = parseKFTime(trigger.cron_schedule.end_time);
    } else if (trigger.periodic_schedule) {
      triggerType = ScheduledType.PERIODIC;
      value = convertSecondsToPeriodicTime(parseInt(trigger.periodic_schedule.interval_second));
      start = parseKFTime(trigger.periodic_schedule.start_time);
      end = parseKFTime(trigger.periodic_schedule.end_time);
    } else {
      triggerType = ScheduledType.PERIODIC;
      value = DEFAULT_PERIODIC_OPTION;
    }

    const runType: RunType = {
      type: RunTypeOption.SCHEDULED,
      data: {
        triggerType,
        value,
        start,
        end,
      },
    };
    setFunction('runType', runType);
  }, [setFunction, initialData]);
};

export const useUpdateParams = (
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  initialData?: PipelineRunKF | PipelineRunJobKF,
): void => {
  React.useEffect(() => {
    if (!initialData?.pipeline_spec.parameters) {
      return;
    }
    const params: RunParam[] = initialData.pipeline_spec.parameters.map((p) => ({
      label: p.name,
      value: p.value,
    }));
    setFunction('params', params);
  }, [setFunction, initialData]);
};

const getPipelineInputParams = (
  version: PipelineVersionKF | undefined,
  pipeline?: PipelineKF | undefined,
): RunParam[] | undefined => {
  let parameters = version?.parameters;

  if (!version) {
    parameters = pipeline?.default_version?.parameters || pipeline?.parameters;
  }

  return (parameters || []).map((p) => ({ label: p.name, value: p.value }));
};

const useUpdatePipelineRunFormData = (
  runFormState: GenericObjectState<RunFormData>,
  pipeline: PipelineKF | undefined,
  version: PipelineVersionKF | undefined,
) => {
  const [formData, setFormValue] = runFormState;

  React.useEffect(() => {
    if (!formData.pipeline && pipeline) {
      setFormValue('pipeline', pipeline);
    }

    if (!formData.version && version) {
      setFormValue('version', version);
    }
  }, [pipeline, version, formData.pipeline, formData.version, setFormValue]);
};

const useRunFormData = (
  initialData?: PipelineRunKF | PipelineRunJobKF | undefined,
  pipeline?: PipelineKF,
  version?: PipelineVersionKF,
): GenericObjectState<RunFormData> => {
  const { project } = usePipelinesAPI();

  const runFormDataState = useGenericObjectState<RunFormData>({
    project,
    nameDesc: {
      name: initialData?.name ? `Duplicate of ${initialData.name}` : '',
      description: initialData?.description ?? '',
    },
    pipeline: pipeline ?? null,
    version: version ?? pipeline?.default_version ?? null,
    runType: { type: RunTypeOption.ONE_TRIGGER },
    params: getPipelineInputParams(version, pipeline),
  });
  const [, setFormValue] = runFormDataState;

  useUpdatePipelineRunFormData(runFormDataState, pipeline, version);
  useUpdateRunType(setFormValue, initialData);
  useUpdateParams(setFormValue, initialData);

  return runFormDataState;
};

export default useRunFormData;
