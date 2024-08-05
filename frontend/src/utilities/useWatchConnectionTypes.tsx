import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { fetchConnectionTypes } from '~/services/connectionTypesService';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

export const useWatchConnectionTypes = (): FetchState<ConnectionTypeConfigMapObj[]> =>
  useFetchState<ConnectionTypeConfigMapObj[]>(fetchConnectionTypes, []);
