import React from 'react';

// Loaded only after the user leaves form mode. A static import pulls Monaco into the
// wizard route, and extension resolution loads that route on every dashboard page.
export const DeploymentWizardYAMLView = React.lazy(() =>
  import('./DeploymentWizardYAMLView').then((module) => ({
    default: module.DeploymentWizardYAMLView,
  })),
);
