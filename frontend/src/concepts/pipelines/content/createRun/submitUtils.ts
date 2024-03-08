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
  InputDefinitionParameterType,
  PipelineVersionKFv2,
  RecurringRunMode,
  RuntimeConfigParameters,
} from '~/concepts/pipelines/kfTypes';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { isFilledRunFormData } from '~/concepts/pipelines/content/createRun/utils';
import { convertPeriodicTimeToSeconds } from '~/utilities/time';

const createRun = async (
  formData: SafeRunFormData,
  createPipelineRun: PipelineAPIs['createPipelineRun'],
): Promise<string> => {
  /* eslint-disable camelcase */
  const data: CreatePipelineRunKFData = {
    display_name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    pipeline_version_reference: {
      pipeline_id: formData.pipeline.pipeline_id || '',
      pipeline_version_id: formData.version?.pipeline_version_id || '',
    },
    runtime_config: {
      parameters: normalizeInputParams(formData.params, formData.version),
    },
    service_account: '',
    experiment_id: formData.experiment?.experiment_id || '',
  };

  /* eslint-enable camelcase */
  return createPipelineRun({}, data).then(
    (runResource) => `/pipelineRun/view/${runResource.run_id}`,
  );
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
  createPipelineRunJob: PipelineAPIs['createPipelineRunJob'],
): Promise<string> => {
  if (formData.runType.type !== RunTypeOption.SCHEDULED) {
    return Promise.reject(new Error('Cannot create a schedule with incomplete data.'));
  }

  const startDate = convertDateDataToKFDateTime(formData.runType.data.start) ?? undefined;
  const endDate = convertDateDataToKFDateTime(formData.runType.data.end) ?? undefined;
  const periodicScheduleIntervalTime = convertPeriodicTimeToSeconds(formData.runType.data.value);

  /* eslint-disable camelcase */
  const data: CreatePipelineRunJobKFData = {
    display_name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    pipeline_version_reference: {
      pipeline_id: formData.pipeline.pipeline_id || '',
      pipeline_version_id: formData.version?.pipeline_version_id || '',
    },
    runtime_config: {
      parameters: normalizeInputParams(formData.params, formData.version),
    },
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
    max_concurrency: String(formData.runType.data.maxConcurrency),
    mode: RecurringRunMode.ENABLE,
    no_catchup: !formData.runType.data.catchUp,
    service_account: '',
    experiment_id: formData.experiment?.experiment_id || '',
  };

  /* eslint-enable camelcase */
  return createPipelineRunJob({}, data).then(() => '');
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

/**
 * Converts string parameters with input definitions that conflict with
 * type string to those respective types (boolean, number).
 */
const normalizeInputParams = (
  params: RuntimeConfigParameters,
  version: PipelineVersionKFv2 | null,
): RuntimeConfigParameters => {
  const inputDefinitionParams = version?.pipeline_spec.root.inputDefinitions.parameters;

  return Object.entries(params).reduce((acc: RuntimeConfigParameters, [paramKey, paramValue]) => {
    const paramType = inputDefinitionParams?.[paramKey].parameterType;

    if (paramType === InputDefinitionParameterType.Boolean) {
      acc[paramKey] = paramValue === 'true';
    } else if (paramType === InputDefinitionParameterType.NumberInteger) {
      acc[paramKey] = paramValue ? parseInt(paramValue.toString()) : 0;
    } else {
      acc[paramKey] = paramValue;
    }

    return acc;
  }, {});
};
