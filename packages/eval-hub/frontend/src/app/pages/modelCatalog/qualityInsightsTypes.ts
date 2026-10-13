type MetadataStringValue = {
  metadataType: 'MetadataStringValue';
  string_value: string;
};

type MetadataDoubleValue = {
  metadataType: 'MetadataDoubleValue';
  double_value: number | null;
};

type EvaluationArtifactCustomProperties = {
  id?: MetadataStringValue;
  model_id?: MetadataStringValue;
  run_id?: MetadataStringValue;
  evaluation?: MetadataStringValue;
  category?: MetadataStringValue;
  benchmark?: MetadataStringValue;
  description?: MetadataStringValue;
  result?: MetadataDoubleValue;
  result_metric?: MetadataStringValue;
  created_at?: MetadataStringValue;
  updated_at?: MetadataStringValue;
  provider_id?: MetadataStringValue;
  collection_id?: MetadataStringValue;
  benchmark_status?: MetadataStringValue;
  job_status?: MetadataStringValue;
  rhoai_version?: MetadataStringValue;
  source_run_ids?: MetadataStringValue;
  execution_context?: MetadataStringValue;
  benchmark_index?: MetadataDoubleValue;
};

export type CatalogQualityArtifact = {
  artifactType: string;
  id?: string;
  name?: string;
  externalId?: string;
  metricsType?: string;
  uri?: string;
  createTimeSinceEpoch?: string;
  lastUpdateTimeSinceEpoch?: string;
  customProperties?: EvaluationArtifactCustomProperties;
};

export type CatalogQualityArtifactList = {
  nextPageToken?: string;
  pageSize?: number;
  size?: number;
  items: CatalogQualityArtifact[];
};

export type QualityInsightsViewProps = {
  sourceId: string;
  modelName: string;
  namespace: string;
};

export type QualityInsight = {
  evaluation: string;
  category: string;
  benchmarkName: string;
  benchmarkDescription: string;
  result: string;
};

export const mapArtifactToQualityInsight = (artifact: CatalogQualityArtifact): QualityInsight => {
  const props = artifact.customProperties;
  const result = props?.result?.double_value;
  const validResult = typeof result === 'number' && Number.isFinite(result) ? result : undefined;

  return {
    evaluation: props?.evaluation?.string_value ?? '',
    category: props?.category?.string_value ?? '',
    benchmarkName: props?.benchmark?.string_value ?? '',
    benchmarkDescription: props?.description?.string_value ?? '',
    result: formatRate(validResult),
  };
};
import { formatRate } from './securityInsightsTypes';
