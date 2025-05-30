import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { getDetectedAccelerators } from '#~/services/acceleratorService';
import { DetectedAccelerators } from '#~/types';

const useDetectedAccelerators = (): FetchState<DetectedAccelerators> =>
  useFetchState<DetectedAccelerators>(getDetectedAccelerators, {
    available: {},
    total: {},
    allocated: {},
    configured: false,
  });

export default useDetectedAccelerators;
