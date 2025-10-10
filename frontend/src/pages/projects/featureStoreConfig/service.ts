import { ConfigMapKind } from '#~/k8sTypes';
import { proxyGET } from '#~/api/proxyUtils';
import {
  FeatureStoreNamespace,
  FeatureStoreClientConfig,
  FeatureStoreConfigurationsResult,
} from './types';

interface WorkbenchFeatureStoreConfig {
  namespace: string;
  configName: string;
  configMap: ConfigMapKind;
  hasAccessToFeatureStore: boolean;
}

interface WorkbenchResponse {
  clientConfigs: WorkbenchFeatureStoreConfig[];
  namespaces: Array<{
    namespace: string;
    clientConfigs: string[];
  }>;
}

export const fetchFeatureStoreConfigurationsFromWorkbench =
  async (): Promise<FeatureStoreConfigurationsResult> => {
    try {
      const workbenchData: WorkbenchResponse = await proxyGET<WorkbenchResponse>(
        '',
        `/api/featurestores/workbench-integration`,
      );
      const clientConfigs: FeatureStoreClientConfig[] = workbenchData.clientConfigs.map(
        (config) => ({
          namespace: config.namespace,
          configName: config.configName,
          configMap: config.configMap,
          hasAccessToFeatureStore: config.hasAccessToFeatureStore,
        }),
      );

      const namespaces: FeatureStoreNamespace[] = workbenchData.namespaces.map((ns) => ({
        namespace: ns.namespace,
        clientConfigs: ns.clientConfigs,
      }));

      return {
        clientConfigs,
        namespaces,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(
        `Failed to fetch feature store configurations from workbench API: ${errorMessage}`,
      );
    }
  };
