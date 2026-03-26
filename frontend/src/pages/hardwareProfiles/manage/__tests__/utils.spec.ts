import { humanizeHardwareProfileError } from '#~/pages/hardwareProfiles/manage/utils';

describe('humanizeHardwareProfileError', () => {
  it('should return a friendly message when a duplicate name error includes a quoted name', () => {
    const k8sError = 'hardwareprofiles.infrastructure.opendatahub.io "my-profile" already exists';
    expect(humanizeHardwareProfileError(k8sError)).toBe(
      'A hardware profile with the name "my-profile" already exists. Please use a different name.',
    );
  });

  it('should return a friendly message when a duplicate name error has no quoted name', () => {
    const k8sError = 'the resource already exists';
    expect(humanizeHardwareProfileError(k8sError)).toBe(
      'A hardware profile with this name already exists. Please use a different name.',
    );
  });

  it('should replace K8s resource group references in non-duplicate errors', () => {
    const k8sError =
      'hardwareprofiles.infrastructure.opendatahub.io is forbidden: User cannot create';
    expect(humanizeHardwareProfileError(k8sError)).toBe(
      'hardware profile is forbidden: User cannot create',
    );
  });

  it('should pass through unrelated error messages unchanged', () => {
    const genericError = 'Network error: connection refused';
    expect(humanizeHardwareProfileError(genericError)).toBe(genericError);
  });
});
