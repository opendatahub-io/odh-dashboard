import {
  EnvVariable,
  EnvVariableDataEntry,
  EnvironmentVariableType,
  SecretCategory,
} from '#~/pages/projects/types';

export const EMPTY_KEY_VALUE_PAIR: EnvVariableDataEntry = {
  key: '',
  value: '',
};

export const EMPTY_EXISTING_SECRET: EnvVariable = {
  type: EnvironmentVariableType.SECRET,
  existingName: '',
  values: {
    category: SecretCategory.EXISTING,
    data: [],
  },
};
