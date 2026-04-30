import React from 'react';
import { getConfigMap } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import useDefaultDsc from '#~/pages/clusterSettings/useDefaultDsc';

export type NIMAccountConfig = {
  registry?: string;
  imagePullSecret?: string;
  isAirGapped: boolean;
  loading: boolean;
  error?: string;
};

type NIMConfigMapState = {
  registry?: string;
  imagePullSecret?: string;
  configLoading: boolean;
  error?: string;
};

/**
 * Hook to read NIM account configuration from the DSC spec and odh-nim-account-cm ConfigMap.
 *
 * Air-gapped mode is determined by spec.components.kserve.nim.airGapped in the
 * DataScienceCluster resource. The ConfigMap provides registry and imagePullSecret
 * values populated by the odh-model-controller when air-gapped mode is enabled.
 */
export const useNIMAccountConfig = (): NIMAccountConfig => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [dsc, dscLoaded] = useDefaultDsc();
  const [config, setConfig] = React.useState<NIMConfigMapState>({
    configLoading: true,
  });

  const nimConfig = dsc?.spec.components?.kserve?.nim;

  React.useEffect(() => {
    const fetchConfig = async () => {
      if (!dashboardNamespace) {
        setConfig({ configLoading: false });
        return;
      }

      try {
        const configMap = await getConfigMap(dashboardNamespace, 'odh-nim-account-cm');
        setConfig({
          registry: configMap.data?.registry,
          imagePullSecret: configMap.data?.imagePullSecret,
          configLoading: false,
        });
      } catch (error) {
        setConfig({
          configLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch NIM account configuration',
        });
      }
    };

    fetchConfig();
  }, [dashboardNamespace]);

  return {
    registry: config.registry,
    imagePullSecret: config.imagePullSecret,
    isAirGapped: nimConfig != null && 'airGapped' in nimConfig && nimConfig.airGapped === true,
    loading: config.configLoading || !dscLoaded,
    error: config.error,
  };
};
