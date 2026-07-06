import { FetchState } from 'mod-arch-core';
import { ModelVersionList } from '~/app/types';
declare const useModelVersions: () => FetchState<ModelVersionList>;
export default useModelVersions;
