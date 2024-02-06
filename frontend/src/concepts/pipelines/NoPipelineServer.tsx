import * as React from 'react';
import { CreatePipelineServerButton } from '~/concepts/pipelines/context';
import EmptyDetailsView from '~/pages/projects/screens/detail/EmptyDetailsView';
import emptyStateImg from '~/images/empty-state-pipelines.svg';

const NoPipelineServer: React.FC = () => (
  <EmptyDetailsView
    title="Start by creating a pipeline"
    description="Standardize and automate machine learning workflows to enable you to further enhance and deploy your data science models."
    iconImage={emptyStateImg}
    imageAlt="create a pipeline"
    allowCreate
    createButton={<CreatePipelineServerButton variant="link" />}
  />
);

export default NoPipelineServer;
