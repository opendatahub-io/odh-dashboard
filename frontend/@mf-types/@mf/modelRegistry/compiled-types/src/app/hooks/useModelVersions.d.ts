import { FetchState } from '~/shared/utilities/useFetchState';
import { ModelVersionList } from '~/app/types';
declare const useModelVersions: () => FetchState<ModelVersionList>;
export default useModelVersions;
