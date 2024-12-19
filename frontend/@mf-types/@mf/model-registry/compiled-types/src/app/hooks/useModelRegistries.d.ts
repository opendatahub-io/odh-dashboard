import { FetchState } from '~/shared/utilities/useFetchState';
import { ModelRegistry } from '~/app/types';
declare const useModelRegistries: (apiPrefix?: string) => FetchState<ModelRegistry[]>;
export default useModelRegistries;
