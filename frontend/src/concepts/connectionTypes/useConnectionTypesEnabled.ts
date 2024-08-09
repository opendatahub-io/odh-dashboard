import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useConnectionTypesEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.CONNECTION_TYPES).status;

export default useConnectionTypesEnabled;
