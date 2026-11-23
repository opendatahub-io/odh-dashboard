import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '../../src/__mocks__/mockHardwareProfile';
import { getHardwareProfileDescription, getHardwareProfileDisplayName } from '../utils';

describe('getHardwareProfileDisplayName', () => {
  it('should use the ODH display name even when an OpenShift display name is present', () => {
    const profile = mockHardwareProfile({
      displayName: 'ODH display name',
      annotations: { 'openshift.io/display-name': 'OpenShift display name' },
    });

    expect(getHardwareProfileDisplayName(profile)).toBe('ODH display name');
  });

  it.each<HardwareProfileKind['metadata']['annotations']>([
    undefined,
    {},
    { 'opendatahub.io/display-name': '' },
    { 'openshift.io/display-name': 'OpenShift display name' },
  ])('should fall back to the resource name for annotations %p', (annotations) => {
    const profile = mockHardwareProfile({ name: 'profile-name' });
    profile.metadata.annotations = annotations;

    expect(getHardwareProfileDisplayName(profile)).toBe('profile-name');
  });
});

describe('getHardwareProfileDescription', () => {
  it('should use the ODH description even when an OpenShift description is present', () => {
    const profile = mockHardwareProfile({
      description: 'ODH description',
      annotations: { 'openshift.io/description': 'OpenShift description' },
    });

    expect(getHardwareProfileDescription(profile)).toBe('ODH description');
  });

  it.each<HardwareProfileKind['metadata']['annotations']>([
    undefined,
    {},
    { 'openshift.io/description': 'OpenShift description' },
  ])(
    'should return undefined when the ODH description is missing from annotations %p',
    (annotations) => {
      const profile = mockHardwareProfile({});
      profile.metadata.annotations = annotations;

      expect(getHardwareProfileDescription(profile)).toBeUndefined();
    },
  );

  it('should preserve an empty ODH description', () => {
    expect(getHardwareProfileDescription(mockHardwareProfile({ description: '' }))).toBe('');
  });
});
