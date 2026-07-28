import { SecurityInsight } from '~/app/pages/modelCatalog/securityInsightsTypes';
type UseSecurityArtifactsResult = {
    insights: SecurityInsight[];
    loaded: boolean;
    loadError: Error | undefined;
};
declare const useSecurityArtifacts: (sourceId: string, modelName: string, namespace: string, pageSize?: number) => UseSecurityArtifactsResult;
export default useSecurityArtifacts;
