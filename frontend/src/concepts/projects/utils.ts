export const isAvailableProject = (projectName: string, dashboardNamespace: string) =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    projectName === 'default' ||
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );
