import { CatalogSourceType } from '~/app/modelCatalogTypes';
import { TrackingOutcome } from '~/concepts/userInteraction';
import {
  buildAccessTokenValidatedTrackingProperties,
  getModelCatalogTrackingSourceType,
  MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
} from '~/app/pages/modelCatalogSettings/tracking/modelCatalogSourcesTracking';

describe('getModelCatalogTrackingSourceType', () => {
  it('should map Hugging Face sources to huggingFace', () => {
    expect(getModelCatalogTrackingSourceType({ type: CatalogSourceType.HUGGING_FACE })).toBe(
      MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
    );
  });

  it('should map YAML sources to yaml', () => {
    expect(getModelCatalogTrackingSourceType({ type: CatalogSourceType.YAML })).toBe('yaml');
  });
});

describe('buildAccessTokenValidatedTrackingProperties', () => {
  it('should build consistent HF validation event properties', () => {
    expect(buildAccessTokenValidatedTrackingProperties(true, true)).toEqual({
      outcome: TrackingOutcome.submit,
      success: true,
      error: undefined,
      sourceType: MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
      hasOrganization: true,
    });
    expect(buildAccessTokenValidatedTrackingProperties(false, false, 'validation_failed')).toEqual({
      outcome: TrackingOutcome.submit,
      success: false,
      error: 'validation_failed',
      sourceType: MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
      hasOrganization: false,
    });
  });
});
