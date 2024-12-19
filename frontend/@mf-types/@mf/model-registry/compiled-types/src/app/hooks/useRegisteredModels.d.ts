import { FetchState } from '~/shared/utilities/useFetchState';
import { RegisteredModelList } from '~/app/types';
declare const useRegisteredModels: () => FetchState<RegisteredModelList>;
export default useRegisteredModels;
