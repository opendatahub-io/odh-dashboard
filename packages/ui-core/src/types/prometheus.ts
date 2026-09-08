import { AxiosError } from 'axios';
import { FetchStateObject } from '../hooks/useFetch';

export type PendingContextResourceData<T> = FetchStateObject<T[], Error | AxiosError> & {
  pending: boolean;
};
