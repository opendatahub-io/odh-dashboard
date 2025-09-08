import { FetchState } from 'mod-arch-shared';
import { ModelVersionList } from '~/app/types';
declare const useModelVersionsByRegisteredModel: (registeredModelId?: string) => FetchState<ModelVersionList>;
export default useModelVersionsByRegisteredModel;
