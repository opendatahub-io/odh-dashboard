import { PipelineRunReference } from '~/concepts/modelRegistry/types';

export enum ModelVersionDetailsTab {
  DETAILS = 'details',
  DEPLOYMENTS = 'deployments',
}

export enum ModelVersionDetailsTabTitle {
  DETAILS = 'Details',
  DEPLOYMENTS = 'Deployments',
}

export type ModelVersionPipelineDescriptionProps = {
  sourceInfo: PipelineRunReference;
  catalogModelUrl?: string;
};
