export type ContinueCondition =
  | 'ilabPipelineInstalled'
  | 'pipelineServerConfigured'
  | 'pipelineServerAccessible'
  | 'pipelineServerOnline';

export type ContinueState =
  | { canContinue: true; selectedProject: string }
  | { canContinue: false; selectedProject: null; missingCondition?: never }
  | { canContinue: false; selectedProject: string; missingCondition: ContinueCondition };
