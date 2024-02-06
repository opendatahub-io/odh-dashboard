import {
  RunDateTime,
  RunFormData,
  RunTypeOption,
  SafeRunFormData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import {
  CreatePipelineRunJobKFData,
  CreatePipelineRunKFv2Data,
  DateTimeKF,
} from '~/concepts/pipelines/kfTypes';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { isFilledRunFormData } from '~/concepts/pipelines/content/createRun/utils';
import { convertPeriodicTimeToSeconds } from '~/utilities/time';

const createRun = async (
  formData: SafeRunFormData,
  createRun: PipelineAPIs['createPipelineRun'],
): Promise<string> => {
  /* eslint-disable camelcase */
  const data: CreatePipelineRunKFv2Data = {
    display_name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    pipeline_version_id: formData.version?.pipeline_version_id || '',
    pipeline_version_reference: {
      pipeline_id: formData.pipeline?.pipeline_id || '',
      pipeline_version_id: formData.version?.pipeline_version_id || '',
    },
    // TODO, update runtime_config & pipeline_spec to be populated from formData
    // https://issues.redhat.com/browse/RHOAIENG-2295
    runtime_config: {
      parameters: { min_max_scaler: false, standard_scaler: true, neighbors: 0 },
      pipeline_root: '',
    },
    pipeline_spec: {
      parameters: formData.params?.map(({ value, label }) => ({ name: label, value })) ?? [],
    },
    service_account: '',
  };
  return createRun({}, data).then((run) => `/pipelineRun/view/${run.run_id}`);
  /* eslint-enable camelcase */
};

const convertDateDataToKFDateTime = (dateData?: RunDateTime): DateTimeKF | null => {
  if (!dateData) {
    return null;
  }

  const date = new Date(`${dateData.date} ${dateData.time}`);
  return date.toISOString();
};

const createJob = async (
  formData: SafeRunFormData,
  createJob: PipelineAPIs['createPipelineRunJob'],
): Promise<string> => {
  if (formData.runType.type !== RunTypeOption.SCHEDULED) {
    return Promise.reject(new Error('Cannot create a scheduled run with incomplete data.'));
  }

  const startDate = convertDateDataToKFDateTime(formData.runType.data.start) ?? undefined;
  const endDate = convertDateDataToKFDateTime(formData.runType.data.end) ?? undefined;
  const periodicScheduleIntervalTime = convertPeriodicTimeToSeconds(formData.runType.data.value);
  /* eslint-disable camelcase */
  const data: CreatePipelineRunJobKFData = {
    name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    pipeline_spec: {
      parameters: formData.params?.map(({ value, label }) => ({ name: label, value })) ?? [],
    },
    max_concurrency: '10',
    enabled: true,
    trigger: {
      periodic_schedule:
        formData.runType.data.triggerType === ScheduledType.PERIODIC
          ? {
              interval_second: periodicScheduleIntervalTime.toString(),
              start_time: startDate,
              end_time: endDate,
            }
          : undefined,
      cron_schedule:
        formData.runType.data.triggerType === ScheduledType.CRON
          ? {
              cron: formData.runType.data.value,
              start_time: startDate,
              end_time: endDate,
            }
          : undefined,
    },
  };
  /* eslint-enable camelcase */
  return createJob({}, data).then(() => '');
};

/** Returns the relative path to navigate to from the namespace qualified route */
export const handleSubmit = (formData: RunFormData, api: PipelineAPIs): Promise<string> => {
  if (!isFilledRunFormData(formData)) {
    throw new Error('Form data was incomplete.');
  }

  switch (formData.runType.type) {
    case RunTypeOption.ONE_TRIGGER:
      return createRun(formData, api.createPipelineRun);
    case RunTypeOption.SCHEDULED:
      return createJob(formData, api.createPipelineRunJob);
    default:
      // eslint-disable-next-line no-console
      console.error('Unknown run type', formData.runType);
      throw new Error('Unknown run type, unable to create run.');
  }
};
