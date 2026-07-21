export type DisplayNameAnnotations = Partial<{
  'openshift.io/description': string;
  'openshift.io/display-name': string;
}>;

export type K8sCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type ListConfigSecretsResponse = {
  secrets: { name: string; keys: string[] }[];
  configMaps: { name: string; keys: string[] }[];
};

export type ConfigSecretItem = {
  name: string;
  keys: string[];
};

export type NamespaceKind = {
  name: string;
  displayName?: string;
};

export type KubeStatus = {
  currentContext: string;
  currentUser: { name: string };
  namespace: string;
  userName: string;
  userID: string;
  clusterID: string;
  clusterBranding: string;
  isAdmin: boolean;
  isAllowed: boolean;
  serverURL: string;
};

export type StatusResponse = {
  kube: KubeStatus;
};

export type DashboardConfigResponse = {
  apiVersion: string;
  kind: string;
  spec: {
    dashboardConfig: Record<string, boolean>;
  };
};

export type ClusterSettings = {
  pvcSize: number;
  cullerTimeout: number;
  userTrackingEnabled: boolean;
  modelServingPlatformEnabled: { kServe: boolean; LLMd: boolean };
  isDistributedInferencingDefault?: boolean;
  defaultDeploymentStrategy?: string;
};

export type AllowedUser = {
  username: string;
  privilege: string;
  lastActivity: string;
};

export type K8sConfigMap = {
  metadata: { name: string; labels?: Record<string, string> };
  data?: Record<string, string>;
};
