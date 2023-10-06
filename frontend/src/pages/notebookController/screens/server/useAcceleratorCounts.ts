import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { getAcceleratorCounts } from '~/services/acceleratorService';
import { AcceleratorInfo } from '~/types';

const useAcceleratorCounts = (): FetchState<AcceleratorInfo> =>
  useFetchState<AcceleratorInfo>(getAcceleratorCounts, {
    available: {},
    total: {},
    allocated: {},
    configured: false,
  });

export default useAcceleratorCounts;
