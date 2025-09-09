export const isFeatureStoreAccessibleProject = (
  projectName: string,
  dashboardNamespace: string,
): boolean =>
  !(
    projectName.startsWith('openshift-') ||
    projectName.startsWith('kube-') ||
    // Note: We DO allow 'default' for FeatureStore access (unlike regular ProjectsContext)
    projectName === 'system' ||
    projectName === 'openshift' ||
    projectName === dashboardNamespace
  );
