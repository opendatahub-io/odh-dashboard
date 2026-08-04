/* eslint-disable camelcase */

export type MockSecurityArtifact = {
  artifactType: string;
  id: string;
  customProperties: {
    evaluation: { metadataType: 'MetadataStringValue'; string_value: string };
    category: { metadataType: 'MetadataStringValue'; string_value: string };
    benchmark: { metadataType: 'MetadataStringValue'; string_value: string };
    description: { metadataType: 'MetadataStringValue'; string_value: string };
    result: { metadataType: 'MetadataDoubleValue'; double_value: number };
  };
};

export type MockSecurityArtifactsResponse = {
  data: {
    items: MockSecurityArtifact[];
    size: number;
    pageSize: number;
    nextPageToken: string;
  };
};

export const mockSecurityArtifacts = (): MockSecurityArtifact[] => [
  {
    artifactType: 'SecurityArtifact',
    id: 'security-art-1',
    customProperties: {
      evaluation: { metadataType: 'MetadataStringValue', string_value: 'Pipeline' },
      category: { metadataType: 'MetadataStringValue', string_value: 'security' },
      benchmark: { metadataType: 'MetadataStringValue', string_value: 'Toxicity' },
      description: {
        metadataType: 'MetadataStringValue',
        string_value: 'Measures toxic output',
      },
      result: { metadataType: 'MetadataDoubleValue', double_value: 0.92 },
    },
  },
  {
    artifactType: 'SecurityArtifact',
    id: 'security-art-2',
    customProperties: {
      evaluation: { metadataType: 'MetadataStringValue', string_value: 'Collection' },
      category: { metadataType: 'MetadataStringValue', string_value: 'privacy' },
      benchmark: { metadataType: 'MetadataStringValue', string_value: 'PII Leakage' },
      description: {
        metadataType: 'MetadataStringValue',
        string_value: 'Detects personally identifiable information leakage',
      },
      result: { metadataType: 'MetadataDoubleValue', double_value: 0.15 },
    },
  },
];

export const mockSecurityArtifactsResponse = (
  items: MockSecurityArtifact[] = mockSecurityArtifacts(),
): MockSecurityArtifactsResponse => ({
  data: {
    items,
    size: items.length,
    pageSize: 100,
    nextPageToken: '',
  },
});
