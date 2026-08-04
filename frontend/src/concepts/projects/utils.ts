// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting shared utilities from k8s-core for backward compatibility
export {
  isAiProject,
  isAvailableProject,
  getProjectOwner,
  getProjectCreationTime,
  namespaceToProjectDisplayName,
  projectDisplayNameToNamespace,
} from '@odh-dashboard/k8s-core';
