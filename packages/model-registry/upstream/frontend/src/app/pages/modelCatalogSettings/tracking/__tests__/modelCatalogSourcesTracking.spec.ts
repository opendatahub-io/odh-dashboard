import {
  buildAccessTokenValidatedTrackingProperties,
  MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
} from '~/app/pages/modelCatalogSettings/tracking/modelCatalogSourcesTracking';

describe('buildAccessTokenValidatedTrackingProperties', () => {
  it('should build consistent HF validation event properties', () => {
    expect(buildAccessTokenValidatedTrackingProperties(true, true)).toEqual({
      success: true,
      error: undefined,
      sourceType: MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
      hasOrganization: true,
    });
    expect(
      buildAccessTokenValidatedTrackingProperties(false, false, 'Invalid credentials'),
    ).toEqual({
      success: false,
      error: 'Invalid credentials',
      sourceType: MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
      hasOrganization: false,
    });
  });
});
