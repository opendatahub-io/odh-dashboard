import { isPercentageMetric, formatMetricValue } from '~/app/utilities/evaluationUtils';
import { formatRate } from './securityInsightsTypes';

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
  catalogNamespace?: string;
};

export type QualityInsight = {
  id?: string;
  resultMetric?: string;
  evaluation: string;
  category: string;
  benchmarkName: string;
  benchmarkDescription: string;
  score: number | undefined;
  result: string;
  createdAt?: string;
};

const getArtifactCreatedAt = (artifact: CatalogQualityArtifact): string | undefined => {
  const customCreatedAt = artifact.customProperties?.created_at?.string_value;
  if (customCreatedAt && !Number.isNaN(new Date(customCreatedAt).getTime())) {
    return customCreatedAt;
  }

  if (!artifact.createTimeSinceEpoch) {
    return undefined;
  }

  const date = new Date(Number(artifact.createTimeSinceEpoch));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const mapArtifactToQualityInsight = (artifact: CatalogQualityArtifact): QualityInsight => {
  const props = artifact.customProperties;
  const id = artifact.id ?? artifact.externalId ?? props?.id?.string_value;
  const resultMetric = props?.result_metric?.string_value;
  const result = props?.result?.double_value;
  const validResult = typeof result === 'number' && Number.isFinite(result) ? result : undefined;
  const createdAt = getArtifactCreatedAt(artifact);

  const formattedResult =
    validResult === undefined
      ? ''
      : isPercentageMetric(resultMetric)
        ? formatRate(validResult)
        : formatMetricValue(validResult, resultMetric);

  return {
    ...(id ? { id } : {}),
    ...(resultMetric ? { resultMetric } : {}),
    ...(createdAt ? { createdAt } : {}),
    evaluation: props?.evaluation?.string_value ?? '',
    category: props?.category?.string_value ?? '',
    benchmarkName: props?.benchmark?.string_value ?? '',
    benchmarkDescription: props?.description?.string_value ?? '',
    score: validResult,
    result: formattedResult,
  };
};
