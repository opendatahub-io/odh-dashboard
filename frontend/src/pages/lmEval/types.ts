export type LmModelArgument = {
  name: string;
  url: string;
  tokenizedRequest: string;
  tokenizer: string;
};

export type LmEvalFormData = {
  deployedModelName: string;
  k8sName?: string;
  evaluationName: string;
  tasks: string[];
  modelType: string;
  allowRemoteCode: boolean;
  allowOnline: boolean;
  model: LmModelArgument;
};

export enum LMEvalState {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
}
