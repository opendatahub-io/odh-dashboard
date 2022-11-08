import * as React from 'react';
import { getSecretsByLabel } from '../../../../api';
import { SecretKind } from '../../../../k8sTypes';
import { getModelServiceAccountName } from '../../utils';

const useServingRuntimeSecrets = (
  namespace?: string,
): [
  secrets: SecretKind[],
  loaded: boolean,
  loadError: Error | undefined,
  refreshSecrets: () => void,
] => {
  const [secrets, setSecrets] = React.useState<SecretKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const fetchSecrets = React.useCallback(() => {
    if (!namespace) {
      return;
    }
    getSecretsByLabel('opendatahub.io/dashboard=true', namespace)
      .then((secrets) => {
        setSecrets(
          secrets.filter(
            (secret) =>
              secret.metadata.annotations?.['kubernetes.io/service-account.name'] ===
              getModelServiceAccountName(namespace),
          ),
        );
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e);
        setLoaded(true);
      });
  }, [namespace]);

  React.useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  return [secrets, loaded, loadError, fetchSecrets];
};

export default useServingRuntimeSecrets;
