import { mockProjectK8sResource } from '#~/__mocks__';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import {
  isAvailableProject,
  getProjectOwner,
  getProjectCreationTime,
} from '#~/concepts/projects/utils';

const mockDashboardNamespace = 'mock-opendatahub';

describe('isAvailableProject', () => {
  it('should be false when the project starts with "openshift-"', () => {
    expect(isAvailableProject('openshift-monitoring', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift-apiserver', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift-authentication', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift-config', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift-infra', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift-node', mockDashboardNamespace)).toBe(false);
  });
  it('should be false when the project starts with "kube-"', () => {
    expect(isAvailableProject('kube-public', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('kube-system', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('kube-node-lease', mockDashboardNamespace)).toBe(false);
  });
  it('should be false when the project is "default", "system", or "openshift"', () => {
    expect(isAvailableProject('default', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('system', mockDashboardNamespace)).toBe(false);
    expect(isAvailableProject('openshift', mockDashboardNamespace)).toBe(false);
  });
  it('should be false when the project is where the dashboard is deployed', () => {
    expect(isAvailableProject(mockDashboardNamespace, mockDashboardNamespace)).toBe(false);
  });
  it('should be true in all the other situations', () => {
    expect(isAvailableProject('notebook-images', mockDashboardNamespace)).toBe(true);
    expect(isAvailableProject('openshiftblabla', mockDashboardNamespace)).toBe(true);
    expect(isAvailableProject('kubelike', mockDashboardNamespace)).toBe(true);
    expect(isAvailableProject('odh-not-dashboard', mockDashboardNamespace)).toBe(true);
  });
});

describe('getProjectDisplayName', () => {
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

describe('getProjectDescription', () => {
  it('gets the description', () => {
    const mockProject = mockProjectK8sResource({ description: 'This is a test project' });
    expect(getDescriptionFromK8sResource(mockProject)).toBe('This is a test project');
  });

  it('returns empty string if no description', () => {
    const mockProject = mockProjectK8sResource({ description: '' });
    expect(getDescriptionFromK8sResource(mockProject)).toBe('');
  });
});

describe('getProjectOwner', () => {
  it('gets the requester if present', () => {
    const mockProject = mockProjectK8sResource({ username: 'john-doe' });
    expect(getProjectOwner(mockProject)).toBe('john-doe');
  });

  it('returns empty string if no annotations', () => {
    const mockProject = mockProjectK8sResource({ hasAnnotations: false });
    expect(getProjectOwner(mockProject)).toBe('');
  });

  it('returns empty string if no requester', () => {
    const mockProject = mockProjectK8sResource({ username: '' });
    expect(getProjectOwner(mockProject)).toBe('');
  });
});

describe('getProjectCreationTime', () => {
  it('returns creation timestamp as unix time integer if present', () => {
    const mockProject = mockProjectK8sResource({ creationTimestamp: '2024-04-19T16:36:37.104Z' });
    expect(getProjectCreationTime(mockProject)).toBe(1713544597104);
  });

  it('returns 0 if no timestamp present', () => {
    const mockProject = mockProjectK8sResource({ creationTimestamp: '' });
    expect(getProjectCreationTime(mockProject)).toBe(0);
  });
});
