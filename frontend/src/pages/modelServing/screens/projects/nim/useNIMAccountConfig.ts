import React from 'react';
import { getConfigMap } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';

export type NIMAccountConfig = {
  registry?: string;
  imagePullSecret?: string;
  loading: boolean;
  error?: string;
};

/**
 * Hook to read NIM account configuration from odh-nim-account-cm ConfigMap.
 * This ConfigMap contains registry and imagePullSecret information for air-gapped deployments.
 * When airGapped mode is enabled in DSC, the odh-model-controller populates this ConfigMap
 * with custom registry settings.
 */
export const useNIMAccountConfig = (): NIMAccountConfig => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [config, setConfig] = React.useState<NIMAccountConfig>({
    loading: true,
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      if (!dashboardNamespace) {
        setConfig({ loading: false });
        return;
      }

      try {
        const configMap = await getConfigMap(dashboardNamespace, 'odh-nim-account-cm');
        setConfig({
          registry: configMap.data?.registry,
          imagePullSecret: configMap.data?.imagePullSecret,
          loading: false,
        });
      } catch (error) {
        // ConfigMap might not exist (non-air-gapped mode or NIM not enabled)
        // This is not an error condition - we'll default to nvcr.io
        setConfig({
          loading: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch NIM account configuration',
        });
      }
    };

    fetchConfig();
  }, [dashboardNamespace]);

  return config;
};
