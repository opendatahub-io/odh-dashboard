import type { ModelDeployPrefillInfo } from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import { ModelVersion, RegisteredModel } from '~/app/types';
declare const useRegisteredModelDeployPrefillInfo: (modelVersion: ModelVersion, mrName?: string) => {
    modelDeployPrefillInfo: ModelDeployPrefillInfo;
    registeredModel: RegisteredModel | null;
    loaded: boolean;
    error: Error | undefined;
};
export default useRegisteredModelDeployPrefillInfo;
