import { FetchState } from 'mod-arch-core';
import { RegisteredModel } from '~/app/types';
declare const useRegisteredModelById: (registeredModel?: string) => FetchState<RegisteredModel | null>;
export default useRegisteredModelById;
