import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const useIsManagedPipelinesAvailable = (): boolean => {
  const isAutoMLAvailable = useIsAreaAvailable(SupportedArea.PLUGIN_AUTOML).status;
  const isAutoRAGAvailable = useIsAreaAvailable(SupportedArea.PLUGIN_AUTORAG).status;

  return isAutoMLAvailable || isAutoRAGAvailable;
};

export default useIsManagedPipelinesAvailable;
