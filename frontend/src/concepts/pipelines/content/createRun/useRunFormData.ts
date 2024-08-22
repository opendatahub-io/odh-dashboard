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
  ExperimentKFv2,
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  RuntimeConfigParameters,
  StorageStateKF,
} from '~/concepts/pipelines/kfTypes';

import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PERIODIC_OPTION,
  DEFAULT_TIME,
} from '~/concepts/pipelines/content/createRun/const';
import { convertDateToTimeString, convertSecondsToPeriodicTime } from '~/utilities/time';
import { isPipelineRecurringRun } from '~/concepts/pipelines/content/utils';
import { getInputDefinitionParams } from '~/concepts/pipelines/content/createRun/utils';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';

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
  initialData?: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null,
): void => {
  React.useEffect(() => {
    if (!initialData || !isPipelineRecurringRun(initialData)) {
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

const useUpdateExperimentFormData = (
  formState: GenericObjectState<RunFormData>,
  experiment: ExperimentKFv2 | null | undefined,
) => {
  const [formData, setFormValue] = formState;

  React.useEffect(() => {
    if (formData.experiment) {
      if (formData.experiment.storage_state === StorageStateKF.ARCHIVED) {
        setFormValue('experiment', null);
      }
    } else if (experiment) {
      if (experiment.storage_state === StorageStateKF.ARCHIVED) {
        setFormValue('experiment', null);
      } else {
        setFormValue('experiment', experiment);
      }
    }
  }, [formData.experiment, setFormValue, experiment, formData.runType.type]);
};

const useUpdateCloneData = (
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  initialData?: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null,
) => {
  const cloneRunPipelineId = initialData?.pipeline_version_reference?.pipeline_id || '';
  const cloneRunVersionId = initialData?.pipeline_version_reference?.pipeline_version_id || '';
  const cloneRunExperimentId = initialData?.experiment_id || '';
  const [cloneRunPipelineVersion] = usePipelineVersionById(cloneRunPipelineId, cloneRunVersionId);
  const [cloneRunPipeline] = usePipelineById(cloneRunPipelineId);
  const [cloneExperiment] = useExperimentById(cloneRunExperimentId);

  React.useEffect(() => {
    if (!initialData) {
      return;
    }
    setFunction('experiment', cloneExperiment);
    setFunction('pipeline', cloneRunPipeline);
    setFunction('version', cloneRunPipelineVersion);
  }, [setFunction, initialData, cloneExperiment, cloneRunPipeline, cloneRunPipelineVersion]);
};

const useRunFormData = (
  run?: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null,
  initialFormData?: Partial<RunFormData>,
): GenericObjectState<RunFormData> => {
  const { project } = usePipelinesAPI();
  const { pipeline, version, experiment, nameDesc } = initialFormData || {};

  const formState = useGenericObjectState<RunFormData>({
    project,
    nameDesc: nameDesc ?? { name: '', description: '' },
    pipeline: pipeline ?? null,
    version: version ?? null,
    experiment: experiment ?? null,
    runType: { type: RunTypeOption.ONE_TRIGGER },
    params:
      run?.runtime_config?.parameters ||
      Object.entries(getInputDefinitionParams(version) || {}).reduce(
        (acc: RuntimeConfigParameters, [paramKey, paramValue]) => {
          acc[paramKey] = paramValue.defaultValue ?? '';
          return acc;
        },
        {},
      ),
    ...initialFormData,
  });
  const [, setFormValue] = formState;

  useUpdateExperimentFormData(formState, experiment);
  useUpdateRunType(setFormValue, run);
  useUpdateCloneData(setFormValue, run);

  return formState;
};

export default useRunFormData;
