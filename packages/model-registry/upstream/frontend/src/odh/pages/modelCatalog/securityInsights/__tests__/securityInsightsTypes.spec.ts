/* eslint-disable camelcase -- test fixtures mirror the catalog artifact's snake_case metadata contract */
import {
  mapArtifactToInsight,
  type CatalogSecurityArtifact,
} from '~/odh/pages/modelCatalog/securityInsights/securityInsightsTypes';

const artifact = (
  customProperties: CatalogSecurityArtifact['customProperties'],
): CatalogSecurityArtifact => ({
  artifactType: 'metrics-artifact',
  customProperties,
});

describe('mapArtifactToInsight', () => {
  it('maps string custom properties onto the insight fields', () => {
    const insight = mapArtifactToInsight(
      artifact({
        evaluation: { metadataType: 'MetadataStringValue', string_value: 'toxicity' },
        category: { metadataType: 'MetadataStringValue', string_value: 'safety' },
        benchmark: { metadataType: 'MetadataStringValue', string_value: 'RealToxicityPrompts' },
        description: { metadataType: 'MetadataStringValue', string_value: 'A benchmark' },
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.92 },
      }),
    );
    expect(insight).toEqual({
      evaluation: 'toxicity',
      category: 'safety',
      benchmarkName: 'RealToxicityPrompts',
      benchmarkDescription: 'A benchmark',
      result: '92.0%',
    });
  });

  it('normalizes values greater than 1 without re-scaling', () => {
    const insight = mapArtifactToInsight(
      artifact({ result: { metadataType: 'MetadataDoubleValue', double_value: 62.8 } }),
    );
    expect(insight.result).toBe('62.8%');
  });

  it('inverts the score when lower_is_better is true', () => {
    const insight = mapArtifactToInsight(
      artifact({
        result: { metadataType: 'MetadataDoubleValue', double_value: 0.1 },
        lower_is_better: { metadataType: 'MetadataBoolValue', bool_value: true },
      }),
    );
    expect(insight.result).toBe('90.0%');
  });

  it('returns empty strings when properties are missing', () => {
    expect(mapArtifactToInsight(artifact(undefined))).toEqual({
      evaluation: '',
      category: '',
      benchmarkName: '',
      benchmarkDescription: '',
      result: '',
    });
  });

  it('leaves the result blank when the double value is null or non-finite', () => {
    expect(
      mapArtifactToInsight(
        artifact({ result: { metadataType: 'MetadataDoubleValue', double_value: null } }),
      ).result,
    ).toBe('');
  });
});
