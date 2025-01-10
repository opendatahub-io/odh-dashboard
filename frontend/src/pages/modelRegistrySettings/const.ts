export const ODH_TRUSTED_BUNDLE = 'odh-trusted-ca-bundle';
export const CA_BUNDLE_CRT = 'ca-bundle.crt';
export const ODH_CA_BUNDLE_CRT = 'odh-ca-bundle.crt';

export enum SecureDBRType {
  CLUSTER_WIDE = 'cluster-wide',
  OPENSHIFT = 'openshift',
  EXISTING = 'existing',
  NEW = 'new',
}

export enum ResourceType {
  ConfigMap = 'ConfigMap',
  Secret = 'Secret',
}
