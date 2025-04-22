export enum ModelVersionDetailsTab {
  DETAILS = 'details',
  DEPLOYMENTS = 'deployments',
}

export enum ModelVersionDetailsTabTitle {
  DETAILS = 'Details',
  DEPLOYMENTS = 'Deployments',
}

export type ModelVersionPipelineDescriptionProps = {
  sourceInfo: {
    project: string;
    runId: string;
    runName: string;
  };
  catalogModelUrl?: string;
};
