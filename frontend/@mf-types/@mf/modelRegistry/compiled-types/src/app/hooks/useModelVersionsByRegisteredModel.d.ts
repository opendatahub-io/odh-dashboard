import { FetchState } from '~/shared/utilities/useFetchState';
import { ModelVersionList } from '~/app/types';
declare const useModelVersionsByRegisteredModel: (registeredModelId?: string) => FetchState<ModelVersionList>;
export default useModelVersionsByRegisteredModel;
