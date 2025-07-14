import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { getStorageClasses } from '#~/api';
import { StorageClassKind } from '#~/k8sTypes';

const useStorageClasses = (): FetchState<StorageClassKind[]> =>
  useFetchState(getStorageClasses, []);

export default useStorageClasses;
