export enum ModelVersionDetailsTab {
  DETAILS = 'details',
  DEPLOYMENTS = 'deployments',
}

export enum ModelVersionDetailsTabTitle {
  DETAILS = 'Details',
  DEPLOYMENTS = 'Deployments',
}

export const pipelineRunSpecificKeys: string[] = [
  '_registeredFromPipelineProject',
  '_registeredFromPipelineRunId',
  '_registeredFromPipelineRunName',
];

export type PipelineModelCustomProps = {
  project: string;
  runId: string;
  runName: string;
};
