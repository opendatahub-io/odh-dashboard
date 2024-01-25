import { isAvailableProject } from '~/concepts/projects/utils';

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
