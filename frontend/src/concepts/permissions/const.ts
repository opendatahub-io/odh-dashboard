export const OPENSHIFT_BOOTSTRAPPING_LABEL_KEY = 'kubernetes.io/bootstrapping';
export const OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE = 'rbac-defaults';

export const RBAC_SUBJECT_KIND_USER = 'User';
export const RBAC_SUBJECT_KIND_GROUP = 'Group';

// Default descriptions for well-known OpenShift roles.
// Key format matches getRoleRefKey(): `${kind}:${name}`
export const DEFAULT_ROLE_DESCRIPTIONS: Partial<Record<string, string>> = {
  'ClusterRole:admin': 'Edit the project and manage user access',
  'ClusterRole:edit': 'View and edit the project components',
};
