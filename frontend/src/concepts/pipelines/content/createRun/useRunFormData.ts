import * as React from 'react';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  periodicOptionAsSeconds,
  PeriodicOptions,
  RunDateTime,
  RunFormData,
  RunType,
  RunTypeOption,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import {
  DateTimeKF,
  PipelineCoreResourceKF,
  PipelineKF,
  PipelineRunJobKF,
  PipelineRunKF,
  ResourceReferenceKF,
} from '~/concepts/pipelines/kfTypes';
import { getPipelineCoreResourcePipelineReference } from '~/concepts/pipelines/content/tables/utils';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { FetchState } from '~/utilities/useFetchState';
import { ValueOf } from '~/typeHelpers';
import {
  DEFAULT_CRON_STRING,
  DEFAULT_PERIODIC_OPTION,
  DEFAULT_TIME,
} from '~/concepts/pipelines/content/createRun/const';
import { convertDateToTimeString } from '~/utilities/time';

const isPipelineRunJob = (
  runOrJob?: PipelineRunJobKF | PipelineRunKF,
): runOrJob is PipelineRunJobKF => !!(runOrJob as PipelineRunJobKF)?.trigger;

const useUpdateData = <T extends PipelineCoreResourceKF>(
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  run: T | null = null,
  fieldId: keyof RunFormData,
  referenceFnc: (run: T) => ResourceReferenceKF | undefined,
  useFetchHookFnc: (id?: string) => FetchState<ValueOf<RunFormData>>,
) => {
  const reference = run ? referenceFnc(run) : undefined;
  const [resource, loaded] = useFetchHookFnc(reference?.key.id);
  const resourceRef = React.useRef<ValueOf<RunFormData>>(resource);
  resourceRef.current = resource;
  const setData = React.useCallback(() => {
    if (loaded && resourceRef.current) {
      setFunction(fieldId, resourceRef.current);
    }
  }, [fieldId, loaded, setFunction]);
  React.useEffect(() => {
    setData();
  }, [setData]);
};

const useUpdatePipeline = (
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  initialData?: PipelineCoreResourceKF,
) => {
  const updatedSetFunction = React.useCallback(
    (key, resource) => {
      setFunction(key, resource);
      if (resource && 'parameters' in resource) {
        setFunction(
          'params',
          (resource.parameters || []).map((p) => ({ label: p.name, value: p.value ?? '' })),
        );
      } else {
        setFunction('params', []);
      }
    },
    [setFunction],
  );

  return useUpdateData(
    updatedSetFunction,
    initialData,
    'pipeline',
    getPipelineCoreResourcePipelineReference,
    usePipelineById,
  );
};

// const useUpdateExperiment = (
//   setFunction: UpdateObjectAtPropAndValue<RunFormData>,
//   initialData?: PipelineCoreResourceKF,
// ) =>
//   useUpdateData(
//     setFunction,
//     initialData,
//     'experiment',
//     getPipelineCoreResourceExperimentReference,
//     useExperimentById,
//   );

const parseKFTime = (kfTime?: DateTimeKF): RunDateTime | undefined => {
  if (!kfTime) {
    return undefined;
  }
  const [date] = kfTime.split('T');
  const time = convertDateToTimeString(new Date(kfTime));

  return { date, time: time ?? DEFAULT_TIME };
};

const intervalSecondsAsOption = (numberString?: string): PeriodicOptions => {
  if (!numberString) {
    return DEFAULT_PERIODIC_OPTION;
  }

  const isPeriodicOption = (option: string): option is PeriodicOptions => option in PeriodicOptions;
  const seconds = parseInt(numberString);
  const option = Object.keys(PeriodicOptions).find((o) => periodicOptionAsSeconds[o] === seconds);
  if (!option || !isPeriodicOption(option)) {
    return DEFAULT_PERIODIC_OPTION;
  }

  return PeriodicOptions[option];
};

export const useUpdateRunType = (
  setFunction: UpdateObjectAtPropAndValue<RunFormData>,
  initialData?: PipelineRunKF | PipelineRunJobKF,
) => {
  React.useEffect(() => {
    if (!isPipelineRunJob(initialData)) {
      return;
    }

    const trigger = initialData.trigger;
    let triggerType: ScheduledType;
    let start: RunDateTime | undefined = undefined;
    let end: RunDateTime | undefined = undefined;
    let value: string;
    if (trigger.cron_schedule) {
      triggerType = ScheduledType.CRON;
      value = trigger.cron_schedule.cron ?? DEFAULT_CRON_STRING;
      start = parseKFTime(trigger.cron_schedule.start_time);
      end = parseKFTime(trigger.cron_schedule.end_time);
    } else if (trigger.periodic_schedule) {
      triggerType = ScheduledType.PERIODIC;
      value = intervalSecondsAsOption(trigger.periodic_schedule.interval_second);
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

const useRunFormData = (
  initialData?: PipelineRunKF | PipelineRunJobKF,
  lastPipeline?: PipelineKF,
) => {
  const { project } = usePipelinesAPI();

  const objState = useGenericObjectState<RunFormData>({
    project,
    nameDesc: {
      name: initialData?.name ? `Clone of ${initialData.name}` : '',
      description: initialData?.description ?? '',
    },
    pipeline: lastPipeline ?? null,
    // experiment: null,
    runType: { type: RunTypeOption.ONE_TRIGGER },
    params: lastPipeline
      ? (lastPipeline.parameters || []).map((p) => ({ label: p.name, value: p.value ?? '' }))
      : undefined,
  });

  const setFunction = objState[1];
  useUpdatePipeline(setFunction, initialData);
  // useUpdateExperiment(setFunction, initialData);
  useUpdateRunType(setFunction, initialData);

  return objState;
};

export default useRunFormData;
