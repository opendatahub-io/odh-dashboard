import * as React from 'react';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  RunDateTime,
  RunFormData,
  RunType,
  RunTypeOption,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import {
  DateTimeKF,
  PipelineKFv2,
  PipelineRunJobKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';

import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_MAX_CONCURRENCY,
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
  initialData?: PipelineRunKFv2 | PipelineRunJobKFv2,
): void => {
  React.useEffect(() => {
    if (!initialData || !isPipelineRunJob(initialData)) {
      return;
    }

    const {
      trigger,
      no_catchup: noCatchUp = false,
      max_concurrency: maxConcurrencyString,
    } = initialData;

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

    let maxConcurrency = parseInt(maxConcurrencyString);
    if (Number.isNaN(maxConcurrency)) {
      maxConcurrency = DEFAULT_MAX_CONCURRENCY;
    }

    const runType: RunType = {
      type: RunTypeOption.SCHEDULED,
      data: {
        catchUp: !noCatchUp,
        maxConcurrency,
        triggerType,
        value,
        start,
        end,
      },
    };
    setFunction('runType', runType);
  }, [setFunction, initialData]);
};

const useUpdatePipelineFormData = (
  runFormState: GenericObjectState<RunFormData>,
  pipeline: PipelineKFv2 | undefined,
  version: PipelineVersionKFv2 | undefined,
) => {
  const [formData, setFormValue] = runFormState;

  React.useEffect(() => {
    if (!formData.pipeline && pipeline) {
      setFormValue('pipeline', pipeline);
    }

    if (!formData.version && version) {
      setFormValue('version', version);
    }
  }, [formData.pipeline, formData.version, pipeline, setFormValue, version]);
};

const useRunFormData = (
  run?: PipelineRunKFv2 | PipelineRunJobKFv2 | undefined,
  pipeline?: PipelineKFv2,
  version?: PipelineVersionKFv2,
): GenericObjectState<RunFormData> => {
  const { project } = usePipelinesAPI();

  const runFormDataState = useGenericObjectState<RunFormData>({
    project,
    nameDesc: {
      name: run?.display_name ? `Duplicate of ${run.display_name}` : '',
      description: run?.description ?? '',
    },
    pipeline: pipeline ?? null,
    version: version ?? null,
    runType: { type: RunTypeOption.ONE_TRIGGER },
    params: run?.runtime_config?.parameters || {},
  });
  const [, setFormValue] = runFormDataState;

  useUpdatePipelineFormData(runFormDataState, pipeline, version);
  useUpdateRunType(setFormValue, run);

  return runFormDataState;
};

export default useRunFormData;
