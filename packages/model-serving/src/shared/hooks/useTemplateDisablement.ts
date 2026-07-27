import { FetchOptions, FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import useServingRuntimeConfigList from './useServingRuntimeConfigList';

const useTemplateDisablement = (
  namespace: string | undefined,
  fetcher: (namespace: string) => Promise<string[]>,
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<string[]> =>
  useServingRuntimeConfigList(
    namespace,
    fetcher,
    'Dashboard config template enablement is not configured.',
    fetchOptions,
  );

export default useTemplateDisablement;
