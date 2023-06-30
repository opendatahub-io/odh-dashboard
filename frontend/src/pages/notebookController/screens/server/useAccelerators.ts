import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { AcceleratorKind } from '~/k8sTypes';
import { listAccelerators } from '~/api';

const useAccelerators = (): FetchState<AcceleratorKind[]> =>
  useFetchState<AcceleratorKind[]>(listAccelerators, []);

export default useAccelerators;
