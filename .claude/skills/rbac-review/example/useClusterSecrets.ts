import * as React from 'react';
import { SecretKind } from '#~/k8sTypes';
import { useDashboardNamespace } from '#~/redux/selectors';

const useClusterSecrets = (): [SecretKind[], boolean, Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [secrets, setSecrets] = React.useState<SecretKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const response = await fetch(`/api/k8s/api/v1/namespaces/${dashboardNamespace}/secrets`);
        const data = await response.json();
        setSecrets(data.items || []);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch secrets'));
        setLoaded(true);
      }
    };

    fetchSecrets();
  }, [dashboardNamespace]);

  return [secrets, loaded, error];
};

export default useClusterSecrets;
