import React from 'react';
import ModelDeploymentWizard from './ModelDeploymentWizard';

const CreateModelDeploymentPage: React.FC = () => (
  <ModelDeploymentWizard
    title="Deploy a model"
    description="Configure and deploy your model."
    primaryButtonText="Deploy model"
  />
);

export default CreateModelDeploymentPage;
