export type EnvVarCategoryType = {
  name: string;
  variables: [
    {
      name: string;
      type: string;
    },
  ];
};

export type VariableRow = {
  variableType: string;
  variables: EnvVarType[];
  errors: { [key: string]: string };
};

export type EnvVarType = {
  name: string;
  type: string;
  value: string | number | AWSEnvVarValue;
};

export type AWSEnvVarValue = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_ENDPOINT?: string;
  AWS_DEFAULT_REGION?: string;
  AWS_S3_BUCKET?: string;
};
export enum Categories {
  secret = 'Secret',
  configMap = 'Config Map',
}
export enum SecretCategories {
  keyValue = 'Key / Value',
  aws = 'AWS',
}
export enum ConfigMapCategories {
  keyValue = 'Key / Value',
  upload = 'Upload',
}
