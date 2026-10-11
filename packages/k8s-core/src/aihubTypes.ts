type AIHubCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastProbeTime?: string | null;
  lastTransitionTime?: string;
  lastHeartbeatTime?: string;
};

export type AIHubKind = {
  apiVersion: 'components.platform.opendatahub.io/v1alpha1';
  kind: 'AIHub';
  metadata: {
    name: string;
  };
  spec: {
    instancesNamespace?: string;
  };
  status?: {
    conditions?: AIHubCondition[];
    phase?: string;
  };
};
