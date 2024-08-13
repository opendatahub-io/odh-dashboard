import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useConnectionTypesEnabled = (): boolean =>
  useIsAreaAvailable(SupportedArea.DATA_CONNECTIONS_TYPES).status;

export default useConnectionTypesEnabled;
