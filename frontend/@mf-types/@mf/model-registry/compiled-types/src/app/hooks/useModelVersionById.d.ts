import { FetchState } from '~/shared/utilities/useFetchState';
import { ModelVersion } from '~/app/types';
declare const useModelVersionById: (modelVersionId?: string) => FetchState<ModelVersion | null>;
export default useModelVersionById;
