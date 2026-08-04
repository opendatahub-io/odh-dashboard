import type { ProjectKind } from '@odh-dashboard/k8s-core';
import type { ValidatedConfiguration } from '../../../shared/types/form-data';
import { shouldShowPreconfigureStep } from '../utils';

describe('shouldShowPreconfigureStep', () => {
  it('should return true when no project is provided', () => {
    expect(shouldShowPreconfigureStep(undefined, undefined)).toBe(true);
  });

  it('should return true when project is null', () => {
    expect(shouldShowPreconfigureStep(null, undefined)).toBe(true);
  });

  it('should return false when project exists and no validated configurations', () => {
    const project = { metadata: { name: 'test-project' } } as ProjectKind;
    expect(shouldShowPreconfigureStep(project, undefined)).toBe(false);
  });

  it('should return true when no project and validated configurations exist', () => {
    const configs: ValidatedConfiguration[] = [
      {
        forField: 'runtime',
        title: 'Runtime',
        description: 'Select runtime',
        options: [{ title: 'OpenVINO', description: 'OpenVINO runtime', value: 'openvino' }],
      },
    ];
    expect(shouldShowPreconfigureStep(undefined, { validatedConfigurations: configs })).toBe(true);
  });

  it('should return true when project exists AND validated configurations exist', () => {
    const project = { metadata: { name: 'test-project' } } as ProjectKind;
    const configs: ValidatedConfiguration[] = [
      {
        forField: 'runtime',
        title: 'Runtime',
        description: 'Select runtime',
        options: [{ title: 'OpenVINO', description: 'OpenVINO runtime', value: 'openvino' }],
      },
    ];
    expect(shouldShowPreconfigureStep(project, { validatedConfigurations: configs })).toBe(true);
  });

  it('should return false when project exists and validated configurations array is empty', () => {
    const project = { metadata: { name: 'test-project' } } as ProjectKind;
    expect(shouldShowPreconfigureStep(project, { validatedConfigurations: [] })).toBe(false);
  });

  it('should return false when project exists and validated configurations is undefined', () => {
    const project = { metadata: { name: 'test-project' } } as ProjectKind;
    expect(shouldShowPreconfigureStep(project, {})).toBe(false);
  });

  it('should return false when isEditing is true even with non-empty validated configurations', () => {
    const project = { metadata: { name: 'test-project' } } as ProjectKind;
    const configs: ValidatedConfiguration[] = [
      {
        forField: 'runtime',
        title: 'Runtime',
        description: 'Select runtime',
        options: [{ title: 'OpenVINO', description: 'OpenVINO runtime', value: 'openvino' }],
      },
    ];
    expect(
      shouldShowPreconfigureStep(project, {
        validatedConfigurations: configs,
        isEditing: true,
      }),
    ).toBe(false);
  });
});
