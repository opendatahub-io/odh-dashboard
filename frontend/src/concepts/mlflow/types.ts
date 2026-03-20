export type MlflowExperiment = {
  id: string;
  name: string;
  artifactLocation?: string;
  lifecycleStage?: string;
  tags?: Record<string, string>;
  creationTime?: string;
  lastUpdateTime?: string;
};

export type MlflowExperimentsResponse = {
  data: {
    experiments: MlflowExperiment[];
    nextPageToken?: string;
  };
};

export type MlflowSelectorStatus = { loaded: boolean; error?: Error };
