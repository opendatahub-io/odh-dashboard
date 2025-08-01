import { FetchState } from 'mod-arch-shared';
import { RegisteredModelList } from '~/app/types';
declare const useRegisteredModels: () => FetchState<RegisteredModelList>;
export default useRegisteredModels;
