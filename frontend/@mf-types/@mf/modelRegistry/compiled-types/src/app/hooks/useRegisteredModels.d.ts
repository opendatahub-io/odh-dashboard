import { FetchState } from 'mod-arch-core';
import { RegisteredModelList } from '~/app/types';
declare const useRegisteredModels: () => FetchState<RegisteredModelList>;
export default useRegisteredModels;
