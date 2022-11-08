import * as React from 'react';
import { listInferenceService } from '../../api';
import { InferenceServiceKind } from '../../k8sTypes';

const useInferenceServices = (
  namespace?: string,
): [
  projects: InferenceServiceKind[],
  loaded: boolean,
  loadError: Error | undefined,
  fetchInferenceServices: () => Promise<void>,
] => {
  const [inferenceServices, setInferenceServices] = React.useState<InferenceServiceKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const fetchInferenceServices = React.useCallback(() => {
    return listInferenceService(namespace)
      .then((newInferenceServices) => {
        setInferenceServices(newInferenceServices);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [namespace]);

  React.useEffect(() => {
    if (!loaded) {
      fetchInferenceServices().then(() => {
        setLoaded(true);
      });
    }
    // TODO: No cleanup -- custom hook to manage that??
  }, [loaded, fetchInferenceServices]);

  return [inferenceServices, loaded, loadError, fetchInferenceServices];
};

export default useInferenceServices;
