import { ModelVersion } from '../../app/types';
type DeploymentDetectionResult = {
    hasDeployment: boolean;
    loaded: boolean;
};
export declare const useModelDeploymentDetection: () => {
    hasModelVersionDeployment: (mvId: string) => DeploymentDetectionResult;
    hasRegisteredModelDeployment: (rmId: string, modelVersions: ModelVersion[]) => DeploymentDetectionResult;
    hasRegisteredModelDeploymentByVersionIds: (mvIds: string[]) => DeploymentDetectionResult;
    loaded: boolean;
    deployments: any[] | undefined;
};
export {};
