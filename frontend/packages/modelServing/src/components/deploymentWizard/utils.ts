export const getDeploymentWizardRoute = (currentpath: string, deploymentName?: string): string => {
  if (deploymentName) {
    return `${currentpath}/deploy/edit/${deploymentName}`;
  }
  return `${currentpath}/deploy/create`;
};

export const getDeploymentWizardExitRoute = (currentPath: string): string => {
  let basePath = currentPath.substring(0, currentPath.lastIndexOf('deploy'));
  if (basePath.includes('projects')) {
    basePath += '?section=model-server';
  }
  return basePath;
};
