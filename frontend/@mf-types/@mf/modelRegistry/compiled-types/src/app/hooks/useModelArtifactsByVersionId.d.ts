import { FetchState } from '~/shared/utilities/useFetchState';
import { ModelArtifactList } from '~/app/types';
declare const useModelArtifactsByVersionId: (modelVersionId?: string) => FetchState<ModelArtifactList>;
export default useModelArtifactsByVersionId;
