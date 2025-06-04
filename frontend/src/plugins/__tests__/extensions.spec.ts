import { expectExtensionsToBeValid } from '@odh-dashboard/plugin-core/testing';
import { extensionDeclarations } from '#~/plugins/extensions';

describe('extensions', () => {
  it('should be valid', () => {
    expectExtensionsToBeValid(extensionDeclarations);
  });
});
