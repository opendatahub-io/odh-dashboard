import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useServiceMeshEnabled = (): boolean => useIsAreaAvailable(SupportedArea.SERVICE_MESH).status;

export default useServiceMeshEnabled;
