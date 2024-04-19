import { mockProjectK8sResource } from '~/__mocks__';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  isValidK8sName,
  translateDisplayNameForK8s,
} from '~/concepts/k8s/utils';

describe('getDisplayNameFromK8sResource', () => {
  it('gets the display name when present', () => {
    const mockProject = mockProjectK8sResource({
      k8sName: 'my-project',
      displayName: 'My Project',
    });
    expect(getDisplayNameFromK8sResource(mockProject)).toBe('My Project');
  });

  it('uses the resource name if no display name is present', () => {
    const mockProject = mockProjectK8sResource({
      k8sName: 'my-project',
      displayName: '',
    });
    expect(getDisplayNameFromK8sResource(mockProject)).toBe('my-project');
  });
});

describe('getDescriptionFromK8sResource', () => {
  it('gets the description', () => {
    const mockProject = mockProjectK8sResource({ description: 'This is a test project' });
    expect(getDescriptionFromK8sResource(mockProject)).toBe('This is a test project');
  });

  it('returns empty string if no description', () => {
    const mockProject = mockProjectK8sResource({ description: '' });
    expect(getDescriptionFromK8sResource(mockProject)).toBe('');
  });
});

describe('translateDisplayNameForK8s', () => {
  it('translates a string into a valid k8s name', () => {
    expect(translateDisplayNameForK8s('Test Project 1')).toBe('test-project-1');
    expect(translateDisplayNameForK8s("John Doe's Cool Project!")).toBe('john-does-cool-project');
    expect(translateDisplayNameForK8s('$ymbols & Capitals and Spaces! (These are invalid!)')).toBe(
      'ymbols--capitals-and-spaces-these-are-invalid',
    );
  });
});

describe('isValidK8sName', () => {
  it('identifies invalid names', () => {
    expect(isValidK8sName('')).toBe(false);
    expect(isValidK8sName('Test Project 1')).toBe(false);
    expect(isValidK8sName("John Doe's Cool Project!")).toBe(false);
    expect(isValidK8sName('$ymbols & Capitals and Spaces! (These are invalid!)')).toBe(false);
  });

  it('identifies valid names', () => {
    expect(isValidK8sName(undefined)).toBe(true);
    expect(isValidK8sName('test-project-1')).toBe(true);
    expect(isValidK8sName('john-does-cool-project')).toBe(true);
    expect(isValidK8sName('ymbols--capitals-and-spaces-these-are-invalid')).toBe(true);
  });
});
