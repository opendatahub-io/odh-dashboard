import { EnvVariableDataEntry } from '#~/pages/projects/types';
import { DSPipelineMlflowKind } from '#~/k8sTypes';

export type ObjectStorageNew = {
  newValue: EnvVariableDataEntry[];
};

export type PipelineServerConfigType = {
  database: {
    useDefault: boolean;
    value: EnvVariableDataEntry[];
  };
  objectStorage: ObjectStorageNew;
  storeYamlInKubernetes: boolean;
  enableCaching: boolean;
  enableManagedPipelines: boolean;
  mlflow?: DSPipelineMlflowKind;
};
