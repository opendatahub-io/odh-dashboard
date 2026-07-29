type MetadataStringValue = {
    metadataType: 'MetadataStringValue';
    string_value: string;
};
type MetadataDoubleValue = {
    metadataType: 'MetadataDoubleValue';
    double_value: number;
};
type MetadataBoolValue = {
    metadataType: 'MetadataBoolValue';
    bool_value: boolean;
};
type SecurityArtifactCustomProperties = {
    id?: MetadataStringValue;
    benchmark?: MetadataStringValue;
    category?: MetadataStringValue;
    description?: MetadataStringValue;
    evaluation?: MetadataStringValue;
    model_id?: MetadataStringValue;
    provider_id?: MetadataStringValue;
    result_metric?: MetadataStringValue;
    pass?: MetadataBoolValue;
    lower_is_better?: MetadataBoolValue;
    result?: MetadataDoubleValue;
    threshold?: MetadataDoubleValue;
};
export type CatalogSecurityArtifact = {
    artifactType: string;
    id?: string;
    name?: string;
    externalId?: string;
    metricsType?: string;
    uri?: string;
    createTimeSinceEpoch?: string;
    lastUpdateTimeSinceEpoch?: string;
    customProperties?: SecurityArtifactCustomProperties;
};
export type CatalogSecurityArtifactList = {
    items: CatalogSecurityArtifact[];
};
export type CatalogSecurityArtifactListEnvelope = {
    data: CatalogSecurityArtifactList;
};
export type SecurityInsightsViewProps = {
    sourceId: string;
    modelName: string;
    namespace: string;
};
export type SecurityInsight = {
    evaluation: string;
    category: string;
    benchmarkName: string;
    benchmarkDescription: string;
    result: string;
};
export declare const mapArtifactToInsight: (artifact: CatalogSecurityArtifact) => SecurityInsight;
export {};
