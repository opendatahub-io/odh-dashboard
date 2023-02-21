import * as React from 'react';
import { DSPipelineKind } from '../../../k8sTypes';
import { getPipelinesCR } from '../../../api';

const usePipelineNamespaceCR = (
  namespace: string,
): [namespaceCR: DSPipelineKind | null, loaded: boolean, loadError: Error | undefined] => {
  const [namespacedCR, setNamespacedCR] = React.useState<DSPipelineKind | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    console.debug('Namespace', namespace);
    getPipelinesCR(namespace)
      .then((resource) => {
        setLoadError(undefined);
        setNamespacedCR(resource);
        setLoaded(true);
      })
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          // Not finding is okay, not an error
          setLoadError(undefined);
          setLoaded(true);
          return;
        }
        setLoadError(e);
      });
  }, [namespace]);

  return [namespacedCR, loaded, loadError];
};

export default usePipelineNamespaceCR;
