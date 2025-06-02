export type LmModelArgument = {
  name: string;
  url: string;
  tokenizedRequest: boolean;
  tokenizer: string;
};

export type LmEvalFormData = {
  deployedModelName: string;
  evaluationName: string;
  tasks: string[];
  modelType: string;
  allowRemoteCode: boolean;
  allowOnline: boolean;
  model: LmModelArgument;
  deploymentNamespace: string;
};
