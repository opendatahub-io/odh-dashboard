import { FetchState } from '~/shared/utilities/useFetchState';
import { RegisteredModel } from '~/app/types';
declare const useRegisteredModelById: (registeredModel?: string) => FetchState<RegisteredModel | null>;
export default useRegisteredModelById;
