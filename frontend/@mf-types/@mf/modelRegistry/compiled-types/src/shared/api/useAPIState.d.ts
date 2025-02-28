import { APIState } from '~/shared/api/types';
declare const useAPIState: <T>(hostPath: string | null, createAPI: (path: string) => T) => [apiState: APIState<T>, refreshAPIState: () => void];
export default useAPIState;
