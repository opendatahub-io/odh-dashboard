import * as React from 'react';
import { getServingRuntime } from '~/api';
import { SupportedModelFormats } from '~/k8sTypes';

const useModelFramework = (
  name?: string,
  namespace?: string,
): [models: SupportedModelFormats[], loaded: boolean, loadError: Error | undefined] => {
  const [models, setModels] = React.useState<SupportedModelFormats[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (!name || !namespace) {
      return;
    }
    setLoadError(undefined);
    setLoaded(false);
    getServingRuntime(name, namespace)
      .then((servingRuntime) => {
        setModels(servingRuntime.spec.supportedModelFormats || []);
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [name, namespace]);

  return [models, loaded, loadError];
};

export default useModelFramework;
