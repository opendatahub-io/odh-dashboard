import { AWSDataEntry, EnvVariableDataEntry } from '~/pages/projects/types';

export type ObjectStorageExisting = {
  existingName: string;
  existingValue: AWSDataEntry;
  useExisting: true;
};

export type ObjectStorageNew = {
  newValue: EnvVariableDataEntry[];
  useExisting: false;
};

export type PipelineServerConfigType = {
  database: {
    useDefault: boolean;
    value: EnvVariableDataEntry[];
  };
  objectStorage: ObjectStorageExisting | ObjectStorageNew;
};
