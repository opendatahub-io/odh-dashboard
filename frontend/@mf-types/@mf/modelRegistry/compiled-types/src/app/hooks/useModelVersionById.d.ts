import { FetchState } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
declare const useModelVersionById: (modelVersionId?: string) => FetchState<ModelVersion | null>;
export default useModelVersionById;
