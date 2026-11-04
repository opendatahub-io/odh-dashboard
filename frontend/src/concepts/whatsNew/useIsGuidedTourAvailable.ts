import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAppContext } from '#~/app/AppContext';

/** The tour is RHOAI-branded, so it is hidden on Open Data Hub even when the guidedTour dev flag is on. */
export const useIsGuidedTourAvailable = (): boolean => {
  const { isRHOAI } = useAppContext();
  const areaAvailable = useIsAreaAvailable(SupportedArea.GUIDED_TOUR).status;
  return areaAvailable && isRHOAI;
};
