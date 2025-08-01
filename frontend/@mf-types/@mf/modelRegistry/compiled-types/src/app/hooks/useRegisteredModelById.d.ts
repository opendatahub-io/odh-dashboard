import { FetchState } from 'mod-arch-shared';
import { RegisteredModel } from '~/app/types';
declare const useRegisteredModelById: (registeredModel?: string) => FetchState<RegisteredModel | null>;
export default useRegisteredModelById;
