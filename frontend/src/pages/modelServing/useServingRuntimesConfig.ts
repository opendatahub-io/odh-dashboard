import * as React from 'react';
import { ConfigMapKind } from '../../k8sTypes';
import { getConfigMap } from '../../api';
import { useDashboardNamespace } from '../../redux/selectors';

export type ServingRuntimesConfigResourceData = {
  servingRuntimesConfig: ConfigMapKind | undefined;
  loaded: boolean;
  error?: Error;
  refresh: () => void;
};

export const useServingRuntimesConfig = (): {
  servingRuntimesConfig: ConfigMapKind | undefined;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
} => {
  const [servingRuntimesConfig, setServingRuntimesConfig] = React.useState<
    ConfigMapKind | undefined
  >(undefined);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const { dashboardNamespace } = useDashboardNamespace();

  // Now there's only one model server in the cluster, in the future, we may have multiple model servers
  const fetchServingRuntimesConfig = React.useCallback(() => {
    return getConfigMap(dashboardNamespace, 'servingruntimes-config')
      .then((srcm) => {
        setServingRuntimesConfig(srcm);
      })
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          setError(new Error('Model Servers settings are not properly configured.'));
          return;
        }
        setError(e);
      });
  }, [dashboardNamespace]);

  React.useEffect(() => {
    if (!loaded) {
      fetchServingRuntimesConfig().then(() => {
        setLoaded(true);
      });
    }
  }, [loaded, fetchServingRuntimesConfig]);

  return { servingRuntimesConfig, loaded, error, refresh: fetchServingRuntimesConfig };
};
