import React from 'react';
import ModelDeploymentWizard from './ModelDeploymentWizard';

const EditModelDeploymentPage: React.FC = () => (
  <ModelDeploymentWizard
    title="Edit model deployment"
    description="Update your model deployment configuration."
    primaryButtonText="Update deployment"
  />
);

export default EditModelDeploymentPage;
