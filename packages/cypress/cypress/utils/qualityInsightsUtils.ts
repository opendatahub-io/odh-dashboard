/* eslint-disable camelcase */

export type MockQualityArtifact = {
  artifactType: string;
  id: string;
  metricsType: 'evaluation-metrics';
  customProperties: {
    model_id: { metadataType: 'MetadataStringValue'; string_value: string };
    run_id: { metadataType: 'MetadataStringValue'; string_value: string };
    evaluation: { metadataType: 'MetadataStringValue'; string_value: string };
    category: { metadataType: 'MetadataStringValue'; string_value: string };
    benchmark: { metadataType: 'MetadataStringValue'; string_value: string };
    description: { metadataType: 'MetadataStringValue'; string_value: string };
    result: { metadataType: 'MetadataDoubleValue'; double_value: number };
    result_metric: { metadataType: 'MetadataStringValue'; string_value: string };
    execution_context: { metadataType: 'MetadataStringValue'; string_value: string };
  };
};

export type MockQualityArtifactsResponse = {
  data: {
    items: MockQualityArtifact[];
    size: number;
    pageSize: number;
    nextPageToken: string;
  };
};

export const mockQualityArtifacts = (): MockQualityArtifact[] => [
  {
    artifactType: 'metrics-artifact',
    id: 'quality-art-1',
    metricsType: 'evaluation-metrics',
    customProperties: {
      model_id: { metadataType: 'MetadataStringValue', string_value: 'RedHatAI/example-model' },
      run_id: { metadataType: 'MetadataStringValue', string_value: 'run-quality-001' },
      evaluation: {
        metadataType: 'MetadataStringValue',
        string_value: 'Python function generation',
      },
      category: { metadataType: 'MetadataStringValue', string_value: 'code' },
      benchmark: { metadataType: 'MetadataStringValue', string_value: 'HumanEval' },
      description: {
        metadataType: 'MetadataStringValue',
        string_value: 'Writes correct Python functions from docstring specifications.',
      },
      result: { metadataType: 'MetadataDoubleValue', double_value: 0.628 },
      result_metric: { metadataType: 'MetadataStringValue', string_value: 'accuracy' },
      execution_context: {
        metadataType: 'MetadataStringValue',
        string_value: '{"collection_definition":{"name":"Python function generation"}}',
      },
    },
  },
  {
    artifactType: 'metrics-artifact',
    id: 'quality-art-2',
    metricsType: 'evaluation-metrics',
    customProperties: {
      model_id: { metadataType: 'MetadataStringValue', string_value: 'RedHatAI/example-model' },
      run_id: { metadataType: 'MetadataStringValue', string_value: 'run-quality-001' },
      evaluation: {
        metadataType: 'MetadataStringValue',
        string_value: 'Hard multi-step reasoning',
      },
      category: { metadataType: 'MetadataStringValue', string_value: 'reasoning' },
      benchmark: { metadataType: 'MetadataStringValue', string_value: 'BBH' },
      description: {
        metadataType: 'MetadataStringValue',
        string_value: 'Challenging reasoning tasks across multiple domains.',
      },
      result: { metadataType: 'MetadataDoubleValue', double_value: 0.491 },
      result_metric: { metadataType: 'MetadataStringValue', string_value: 'accuracy' },
      execution_context: {
        metadataType: 'MetadataStringValue',
        string_value: '{"collection_definition":{"name":"Hard multi-step reasoning"}}',
      },
    },
  },
];

export const mockQualityArtifactsResponse = (
  items: MockQualityArtifact[] = mockQualityArtifacts(),
): MockQualityArtifactsResponse => ({
  data: {
    items,
    size: items.length,
    pageSize: 100,
    nextPageToken: '',
  },
});
