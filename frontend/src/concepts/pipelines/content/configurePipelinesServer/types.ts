import { EnvVariableDataEntry } from '#~/pages/projects/types';

export type ObjectStorageNew = {
  newValue: EnvVariableDataEntry[];
};

export type PipelineServerConfigType = {
  database: {
    useDefault: boolean;
    value: EnvVariableDataEntry[];
  };
  objectStorage: ObjectStorageNew;
  enableInstructLab: boolean;
  storeYamlInKubernetes: boolean;
};
