import { createHfAccessCatalogModel } from '~/__tests__/utils/createHfAccessModel';
import { HfAccessType } from '~/concepts/modelCatalog/const';
import {
  getModelCatalogAccessLabelIsAccessGranted,
  getModelCatalogAccessLabelSelectedProperties,
  getModelCatalogAccessLabelType,
  getModelCatalogIsAccessGranted,
  getModelCatalogTrackingHfAccessType,
} from '~/app/pages/modelCatalog/tracking/modelCatalogEngagementTracking';

describe('getModelCatalogTrackingHfAccessType', () => {
  it('should map known HF access types', () => {
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

describe('getModelCatalogAccessLabelType', () => {
  it('should map label variants for tracking', () => {
    expect(getModelCatalogAccessLabelType('private')).toBe('private');
    expect(getModelCatalogAccessLabelType('gated')).toBe('gated');
    expect(getModelCatalogAccessLabelType('gated-denied')).toBe('gated');
  });
});

describe('getModelCatalogAccessLabelIsAccessGranted', () => {
  it('should be false for gated-denied labels', () => {
    const model = createHfAccessCatalogModel({
      hfAccessType: HfAccessType.GATED_AUTO,
      hfGatedAccessGranted: 'false',
    });
    expect(getModelCatalogAccessLabelIsAccessGranted(model, 'gated-denied')).toBe(false);
  });
});

describe('getModelCatalogAccessLabelSelectedProperties', () => {
  it('should combine label type and access grant for tracking', () => {
    const model = createHfAccessCatalogModel({ hfAccessType: HfAccessType.PRIVATE });
    expect(getModelCatalogAccessLabelSelectedProperties(model, 'private')).toEqual({
      accessLabelType: 'private',
      isAccessGranted: true,
    });
  });
});
