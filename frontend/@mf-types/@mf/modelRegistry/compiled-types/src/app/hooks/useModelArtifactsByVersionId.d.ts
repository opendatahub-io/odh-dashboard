import { FetchState } from 'mod-arch-shared';
import { ModelArtifactList } from '~/app/types';
declare const useModelArtifactsByVersionId: (modelVersionId?: string) => FetchState<ModelArtifactList>;
export default useModelArtifactsByVersionId;
