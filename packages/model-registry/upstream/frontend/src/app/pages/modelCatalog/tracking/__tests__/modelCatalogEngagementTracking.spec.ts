import { createHfAccessCatalogModel } from '~/__tests__/utils/createHfAccessModel';
import { HfAccessType } from '~/concepts/modelCatalog/const';
import {
  getModelCatalogIsAccessGranted,
  getModelCatalogTrackingHfAccessType,
} from '~/app/pages/modelCatalog/tracking/modelCatalogEngagementTracking';

describe('getModelCatalogTrackingHfAccessType', () => {
  it('should map known HF access types', () => {
    expect(
      getModelCatalogTrackingHfAccessType(
        createHfAccessCatalogModel({ hfAccessType: HfAccessType.PUBLIC }),
      ),
    ).toBe('public');
    expect(
      getModelCatalogTrackingHfAccessType(
        createHfAccessCatalogModel({ hfAccessType: HfAccessType.PRIVATE }),
      ),
    ).toBe('private');
    expect(
      getModelCatalogTrackingHfAccessType(
        createHfAccessCatalogModel({ hfAccessType: HfAccessType.GATED_AUTO }),
      ),
    ).toBe('gated_auto');
    expect(
      getModelCatalogTrackingHfAccessType(
        createHfAccessCatalogModel({ hfAccessType: HfAccessType.GATED_MANUAL }),
      ),
    ).toBe('gated_manual');
  });

  it('should return other when access type is missing', () => {
    expect(getModelCatalogTrackingHfAccessType({ name: 'org/model' })).toBe('other');
  });
});

describe('getModelCatalogIsAccessGranted', () => {
  it('should reflect gated access grant state', () => {
    const denied = createHfAccessCatalogModel({
      hfAccessType: HfAccessType.GATED_AUTO,
      hfGatedAccessGranted: 'false',
    });
    const granted = createHfAccessCatalogModel({
      hfAccessType: HfAccessType.GATED_AUTO,
      hfGatedAccessGranted: 'true',
    });
    expect(getModelCatalogIsAccessGranted(denied)).toBe(false);
    expect(getModelCatalogIsAccessGranted(granted)).toBe(true);
  });
});
