import {
  RunDateTime,
  RunFormData,
  RunTypeOption,
  SafeRunFormData,
  ScheduledType,
} from '~/concepts/pipelines/content/createRun/types';
import {
  CreatePipelineRunJobKFData,
  CreatePipelineRunKFData,
  DateTimeKF,
  RelationshipKF,
  ResourceReferenceKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { isFilledRunFormData } from '~/concepts/pipelines/content/createRun/utils';
import { convertPeriodicTimeToSeconds } from '~/utilities/time';

const getResourceReferences = (formData: SafeRunFormData): ResourceReferenceKF[] => {
  const refs: ResourceReferenceKF[] = [];

  if (formData.version) {
    refs.push({
      key: {
        id: formData.version.id,
        type: ResourceTypeKF.PIPELINE_VERSION,
      },
      relationship: RelationshipKF.CREATOR,
    });
  }
  // if (formData.experiment) {
  //   refs.push({
  //     key: {
  //       id: formData.experiment.id,
  //       type: ResourceTypeKF.EXPERIMENT,
  //     },
  //     relationship: RelationshipKF.OWNER,
  //   });
  // }

  return refs;
};

const createRun = async (
  formData: SafeRunFormData,
  createRun: PipelineAPIs['createPipelineRun'],
): Promise<string> => {
  /* eslint-disable camelcase */
  const data: CreatePipelineRunKFData = {
    name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    resource_references: getResourceReferences(formData),
    pipeline_spec: {
      parameters: formData.params.map(({ value, label }) => ({ name: label, value })) ?? [],
    },
    service_account: '',
  };
  /* eslint-enable camelcase */
  return createRun({}, data).then((runResource) => `/pipelineRun/view/${runResource.run.id}`);
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
    resource_references: getResourceReferences(formData),
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
