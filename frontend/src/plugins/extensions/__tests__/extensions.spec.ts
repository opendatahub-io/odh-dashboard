import { expectExtensionsToBeValid } from '@odh-dashboard/plugin-core/testing';
import extensions from '../index';

describe('frontend extensions', () => {
  it('should be valid', () => {
    expect(extensions.length).toBeGreaterThan(0);
    expectExtensionsToBeValid(extensions);
  });
});
