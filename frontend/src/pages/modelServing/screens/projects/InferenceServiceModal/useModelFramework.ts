import * as React from 'react';
import { getServingRuntime } from '#~/api';
import { SupportedModelFormats } from '#~/k8sTypes';

const useModelFramework = (
  name?: string,
  namespace?: string,
): [models: SupportedModelFormats[], loaded: boolean, loadError: Error | undefined] => {
  const [models, setModels] = React.useState<SupportedModelFormats[]>([]);
  const [loadedFrameworksForRuntimeName, setLoadedFrameworksForRuntimeName] = React.useState<
    string | null
  >(null);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (!name || !namespace) {
      return;
    }
    setLoadError(undefined);
    setLoadedFrameworksForRuntimeName(null);
    getServingRuntime(name, namespace)
      .then((servingRuntime) => {
        setModels(servingRuntime.spec.supportedModelFormats || []);
        setLoadedFrameworksForRuntimeName(name);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [name, namespace]);

  return [models, loadedFrameworksForRuntimeName === name, loadError];
};

export default useModelFramework;
