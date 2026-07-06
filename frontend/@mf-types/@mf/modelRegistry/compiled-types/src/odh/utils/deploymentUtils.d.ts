import { ModelVersion } from '~/app/types';
import { type ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';
type DeploymentDetectionResult = {
    hasDeployment: boolean;
    loaded: boolean;
};
type UseModelDeploymentDetectionResult = {
    hasModelVersionDeployment: (mvId: string) => DeploymentDetectionResult;
    hasRegisteredModelDeployment: (rmId: string, modelVersions: ModelVersion[]) => DeploymentDetectionResult;
    hasRegisteredModelDeploymentByVersionIds: (mvIds: string[]) => DeploymentDetectionResult;
    loaded: boolean;
    deployments: ModelRegistryDeploymentListItem[] | undefined;
};
export declare const useModelDeploymentDetection: () => UseModelDeploymentDetectionResult;
export {};
