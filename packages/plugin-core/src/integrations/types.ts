export enum VariablesValidationStatus {
  UNKNOWN = 'Unknown',
  FAILED = 'False',
  SUCCESS = 'True',
}

export type IntegrationAppStatus = {
  isInstalled: boolean;
  isEnabled: boolean;
  canInstall: boolean;
  variablesValidationStatus?: VariablesValidationStatus;
  variablesValidationTimestamp?: string;
  error: string;
};
