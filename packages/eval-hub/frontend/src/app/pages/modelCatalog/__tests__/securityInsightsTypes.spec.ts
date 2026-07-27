/* eslint-disable camelcase */
import { mapArtifactToInsight } from '~/app/pages/modelCatalog/securityInsightsTypes';
import type { CatalogSecurityArtifact } from '~/app/pages/modelCatalog/securityInsightsTypes';

describe('mapArtifactToInsight', () => {
  it('should map a fully-populated artifact to a SecurityInsight', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      id: 'art-1',
      customProperties: {
        evaluation: { metadataType: 'MetadataStringValue', string_value: 'Pipeline' },
        category: { metadataType: 'MetadataStringValue', string_value: 'Security' },
        benchmark: { metadataType: 'MetadataStringValue', string_value: 'Prompt Injection' },
        description: {
          metadataType: 'MetadataStringValue',
          string_value: 'Tests resistance to prompt injection attacks',
        },
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.85 },
      },
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight).toEqual({
      evaluation: 'Pipeline',
      category: 'Security',
      benchmarkName: 'Prompt Injection',
      benchmarkDescription: 'Tests resistance to prompt injection attacks',
      result: '85.0%',
    });
  });

  it('should return empty strings when customProperties is undefined', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight).toEqual({
      evaluation: '',
      category: '',
      benchmarkName: '',
      benchmarkDescription: '',
      result: '',
    });
  });

  it('should return empty strings when individual properties are missing', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      customProperties: {},
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight).toEqual({
      evaluation: '',
      category: '',
      benchmarkName: '',
      benchmarkDescription: '',
      result: '',
    });
  });

  it('should format a ratio value (<=1) as a percentage', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      customProperties: {
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.723 },
      },
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight.result).toBe('72.3%');
  });

  it('should treat a pre-scaled value (>1) as already a percentage', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      customProperties: {
        result: { metadataType: 'MetadataDoubleValue', double_value: 85.0 },
      },
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight.result).toBe('85.0%');
  });

  it('should handle a result of 0', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      customProperties: {
        result: { metadataType: 'MetadataDoubleValue', double_value: 0 },
      },
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight.result).toBe('0.0%');
  });

  it('should handle a result of exactly 1 (100%)', () => {
    const artifact: CatalogSecurityArtifact = {
      artifactType: 'SecurityArtifact',
      customProperties: {
        result: { metadataType: 'MetadataDoubleValue', double_value: 1.0 },
      },
    };

    const insight = mapArtifactToInsight(artifact);

    expect(insight.result).toBe('100.0%');
  });
});
