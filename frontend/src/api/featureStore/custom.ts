import { proxyGET } from '#~/api/proxyUtils';
import { K8sAPIOptions } from '#~/k8sTypes';

export type WorkbenchFeatureStoreResponse = {
  namespaces: Array<{
    namespace: string;
    clientConfigs: Array<{
      configName: string;
      projectName: string;
      hasAccessToFeatureStore: boolean;
      permissionLevel: string[];
    }>;
  }>;
};

export const getWorkbenchFeatureStores = (
  opts?: K8sAPIOptions,
): Promise<WorkbenchFeatureStoreResponse> =>
  proxyGET<WorkbenchFeatureStoreResponse>('', '/api/featurestores/workbench-integration', {}, opts);

export type FeatureStoreConnectedWorkbench = {
  workbenchName: string;
  workbenchNamespace: string;
  projectName: string;
};

export type FeatureStoreProject = {
  feastProjectName: string;
  namespace: string;
  description?: string;
  permissionLevel: string[];
  connectedWorkbenches: FeatureStoreConnectedWorkbench[];
};

export type FeatureStoreProjectsResponse = {
  connectedWorkbenches: FeatureStoreProject[];
};

export const getFeatureStoreProjects = (
  opts?: K8sAPIOptions,
): Promise<FeatureStoreProjectsResponse> =>
  proxyGET<FeatureStoreProjectsResponse>(
    '',
    '/api/featurestores/projects-with-workbenches',
    {},
    opts,
  );
