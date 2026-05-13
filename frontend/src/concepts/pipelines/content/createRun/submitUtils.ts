import {
  MlflowFormData,
  PipelineVersionToUse,
  RunDateTime,
  RunFormData,
  RunTypeOption,
  SafeRunFormData,
  ScheduledType,
} from '#~/concepts/pipelines/content/createRun/types';
import {
  CreatePipelineRecurringRunKFData,
  CreatePipelineRunKFData,
  DateTimeKF,
  InputDefinitionParameterType,
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineVersionKF,
  RecurringRunMode,
  RuntimeConfigParameters,
  StorageStateKF,
} from '#~/concepts/pipelines/kfTypes';
import { PipelineAPIs } from '#~/concepts/pipelines/types';
import {
  getInputDefinitionParams,
  getMlflowExperimentName,
  isFilledRunFormData,
} from '#~/concepts/pipelines/content/createRun/utils';
import { convertPeriodicTimeToSeconds, convertToDate } from '#~/utilities/time';

const buildMlflowPluginsInput = (
  mlflow: MlflowFormData,
  isMlflowAvailable: boolean,
): Record<string, Record<string, unknown>> | undefined => {
  if (!isMlflowAvailable) {
    return undefined;
  }

  if (!mlflow.isExperimentTrackingEnabled) {
    return {
      mlflow: {
        disabled: true,
      },
    };
  }

  const mlflowExperimentName = getMlflowExperimentName(mlflow);
  if (!mlflowExperimentName) {
    return undefined;
  }

  return {
    mlflow: {
      // eslint-disable-next-line camelcase
      experiment_name: mlflowExperimentName,
    },
  };
};

const createRun = async (
  formData: SafeRunFormData,
  api: PipelineAPIs,
  isMlflowAvailable: boolean,
  dryRun?: boolean,
): Promise<PipelineRunKF> => {
  const pluginsInput = buildMlflowPluginsInput(formData.mlflow, isMlflowAvailable);

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
    ...(pluginsInput && { plugins_input: pluginsInput }),
  };

  /* eslint-enable camelcase */
  return api.createPipelineRun({ dryRun }, data);
};

export const convertDateDataToKFDateTime = (dateData?: RunDateTime): DateTimeKF | null => {
  if (!dateData) {
    return null;
  }
  const date = convertToDate(dateData);
  return date.toISOString();
};

const createRecurringRun = async (
  formData: SafeRunFormData,
  api: PipelineAPIs,
  isMlflowAvailable: boolean,
  dryRun?: boolean,
): Promise<PipelineRecurringRunKF> => {
  if (formData.runType.type !== RunTypeOption.SCHEDULED) {
    return Promise.reject(new Error('Cannot create a schedule with incomplete data.'));
  }

  const pluginsInput = buildMlflowPluginsInput(formData.mlflow, isMlflowAvailable);
  const startDate = convertDateDataToKFDateTime(formData.runType.data.start) ?? undefined;
  const endDate = convertDateDataToKFDateTime(formData.runType.data.end) ?? undefined;
  const periodicScheduleIntervalTime = convertPeriodicTimeToSeconds(formData.runType.data.value);

  /* eslint-disable camelcase */
  const data: CreatePipelineRecurringRunKFData = {
    display_name: formData.nameDesc.name,
    description: formData.nameDesc.description,
    pipeline_version_reference: {
      pipeline_id: formData.pipeline.pipeline_id || '',
      pipeline_version_id:
        formData.versionToUse === PipelineVersionToUse.PROVIDED
          ? formData.version?.pipeline_version_id
          : undefined,
    },
    runtime_config: {
      parameters: normalizeInputParams(formData.params, formData.version),
    },
    trigger: {
      periodic_schedule:
        formData.runType.data.triggerType === ScheduledType.PERIODIC
          ? {
              interval_second: periodicScheduleIntervalTime.toLocaleString('fullwide', {
                useGrouping: false,
              }),
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
    mode:
      formData.experiment?.storage_state === StorageStateKF.ARCHIVED
        ? RecurringRunMode.DISABLE
        : RecurringRunMode.ENABLE,
    no_catchup: !formData.runType.data.catchUp,
    service_account: '',
    experiment_id: formData.experiment?.experiment_id || '',
    ...(pluginsInput && { plugins_input: pluginsInput }),
  };
  /* eslint-enable camelcase */

  return api.createPipelineRecurringRun({ dryRun }, data);
};

const isMissingRequiredMlflowExperiment = (
  mlflow: MlflowFormData,
  isMlflowAvailable: boolean,
): boolean =>
  isMlflowAvailable && mlflow.isExperimentTrackingEnabled && !getMlflowExperimentName(mlflow);

/** Returns the relative path to navigate to from the namespace qualified route */
export const handleSubmit = (
  formData: RunFormData,
  api: PipelineAPIs,
  isMlflowAvailable: boolean,
): Promise<PipelineRunKF | PipelineRecurringRunKF> => {
  if (isMissingRequiredMlflowExperiment(formData.mlflow, isMlflowAvailable)) {
    return Promise.reject(
      new Error('MLflow experiment name is required when MLflow integration is enabled.'),
    );
  }

  if (!isFilledRunFormData(formData, isMlflowAvailable)) {
    return Promise.reject(new Error('Form data was incomplete.'));
  }

  switch (formData.runType.type) {
    case RunTypeOption.ONE_TRIGGER:
      return createRun(formData, api, isMlflowAvailable);
    case RunTypeOption.SCHEDULED:
      return createRecurringRun(formData, api, isMlflowAvailable);
    default:
      // eslint-disable-next-line no-console
      console.error('Unknown run type', formData.runType);
      return Promise.reject(new Error('Unknown run type, unable to create run.'));
  }
};

/**
 * Converts string parameters with input definitions that conflict with
 * type string to those respective types (boolean, number).
 */
const normalizeInputParams = (
  params: RuntimeConfigParameters,
  version: PipelineVersionKF | null,
): RuntimeConfigParameters =>
  Object.entries(params).reduce((acc: RuntimeConfigParameters, [paramKey, paramValue]) => {
    const inputDefinitionParams = getInputDefinitionParams(version);
    const paramType = inputDefinitionParams?.[paramKey].parameterType;

    if (paramValue === undefined || paramValue === '') {
      acc[paramKey] = undefined;
      return acc;
    }

    switch (paramType) {
      case InputDefinitionParameterType.INTEGER:
        acc[paramKey] = parseInt(String(paramValue));
        break;
      case InputDefinitionParameterType.DOUBLE:
        acc[paramKey] = parseFloat(String(paramValue));
        break;
      case InputDefinitionParameterType.STRUCT:
      case InputDefinitionParameterType.LIST:
        acc[paramKey] = JSON.parse(
          typeof paramValue !== 'string' ? JSON.stringify(paramValue) : paramValue,
        );
        break;
      default:
        acc[paramKey] = paramValue;
    }

    return acc;
  }, {});
