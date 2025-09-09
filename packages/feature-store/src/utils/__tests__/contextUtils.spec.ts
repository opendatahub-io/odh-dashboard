import { isFeatureStoreAccessibleProject } from '../contextUtils';

const mockDashboardNamespace = 'mock-opendatahub';

describe('isFeatureStoreAccessibleProject', () => {
  it('should be false when the project starts with "openshift-"', () => {
    expect(isFeatureStoreAccessibleProject('openshift-monitoring', mockDashboardNamespace)).toBe(
      false,
    );
    expect(isFeatureStoreAccessibleProject('openshift-apiserver', mockDashboardNamespace)).toBe(
      false,
    );
    expect(
      isFeatureStoreAccessibleProject('openshift-authentication', mockDashboardNamespace),
    ).toBe(false);
    expect(isFeatureStoreAccessibleProject('openshift-config', mockDashboardNamespace)).toBe(false);
    expect(isFeatureStoreAccessibleProject('openshift-infra', mockDashboardNamespace)).toBe(false);
    expect(isFeatureStoreAccessibleProject('openshift-node', mockDashboardNamespace)).toBe(false);
  });

  it('should be false when the project starts with "kube-"', () => {
    expect(isFeatureStoreAccessibleProject('kube-public', mockDashboardNamespace)).toBe(false);
    expect(isFeatureStoreAccessibleProject('kube-system', mockDashboardNamespace)).toBe(false);
    expect(isFeatureStoreAccessibleProject('kube-node-lease', mockDashboardNamespace)).toBe(false);
  });

  it('should be false when the project is "system" or "openshift"', () => {
    expect(isFeatureStoreAccessibleProject('system', mockDashboardNamespace)).toBe(false);
    expect(isFeatureStoreAccessibleProject('openshift', mockDashboardNamespace)).toBe(false);
  });

  it('should be true when the project is "default" (unlike regular ProjectsContext)', () => {
    expect(isFeatureStoreAccessibleProject('default', mockDashboardNamespace)).toBe(true);
  });

  it('should be false when the project is where the dashboard is deployed', () => {
    expect(isFeatureStoreAccessibleProject(mockDashboardNamespace, mockDashboardNamespace)).toBe(
      false,
    );
  });

  it('should be true in all the other valid situations', () => {
    expect(isFeatureStoreAccessibleProject('notebook-images', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('openshiftblabla', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('kubelike', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('odh-not-dashboard', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('user-project', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('feature-store-project', mockDashboardNamespace)).toBe(
      true,
    );
  });

  it('should handle edge cases properly', () => {
    expect(isFeatureStoreAccessibleProject('', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('my-openshift-project', mockDashboardNamespace)).toBe(
      true,
    );
    expect(isFeatureStoreAccessibleProject('project-kube-test', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('OPENSHIFT-TEST', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('KUBE-TEST', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('SYSTEM', mockDashboardNamespace)).toBe(true);
    expect(isFeatureStoreAccessibleProject('DEFAULT', mockDashboardNamespace)).toBe(true);
  });
});
