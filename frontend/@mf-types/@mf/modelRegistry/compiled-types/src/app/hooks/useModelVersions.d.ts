import { FetchState } from 'mod-arch-shared';
import { ModelVersionList } from '~/app/types';
declare const useModelVersions: () => FetchState<ModelVersionList>;
export default useModelVersions;
