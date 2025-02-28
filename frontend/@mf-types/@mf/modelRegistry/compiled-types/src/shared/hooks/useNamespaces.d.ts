import { FetchState } from '~/shared/utilities/useFetchState';
import { Namespace } from '~/shared/types';
declare const useNamespaces: () => FetchState<Namespace[]>;
export default useNamespaces;
