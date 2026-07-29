import {
  DEPLOYMENTS_BASE_PATH,
  DEPLOYMENTS_EXTERNAL_SEGMENT,
  DEPLOYMENTS_INTERNAL_SEGMENT,
  DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT,
  deploymentsExternalPath,
  deploymentsInternalPath,
  deploymentsLegacyPath,
  getLegacyNamespaceFromPath,
  isExternalDeploymentsPath,
} from '../deploymentsPaths';

describe('deploymentsPaths', () => {
  describe('deploymentsInternalPath', () => {
    it('should return the internal base path when namespace is omitted', () => {
      expect(deploymentsInternalPath()).toBe(
        `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_INTERNAL_SEGMENT}`,
      );
    });

    it('should return the internal path with namespace', () => {
      expect(deploymentsInternalPath('ai-tenants')).toBe(
        `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_INTERNAL_SEGMENT}/ai-tenants`,
      );
    });
  });

  describe('deploymentsExternalPath', () => {
    it('should return the external base path when namespace is omitted', () => {
      expect(deploymentsExternalPath()).toBe(
        `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_EXTERNAL_SEGMENT}`,
      );
    });

    it('should return the external path with namespace', () => {
      expect(deploymentsExternalPath('ai-tenants')).toBe(
        `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_EXTERNAL_SEGMENT}/ai-tenants`,
      );
    });
  });

  describe('deploymentsLegacyPath', () => {
    it('should return the deployments base path when namespace is omitted', () => {
      expect(deploymentsLegacyPath()).toBe(DEPLOYMENTS_BASE_PATH);
    });

    it('should return the legacy flat path with namespace', () => {
      expect(deploymentsLegacyPath('ai-tenants')).toBe(`${DEPLOYMENTS_BASE_PATH}/ai-tenants`);
    });
  });

  describe('isExternalDeploymentsPath', () => {
    it('should match the external base path', () => {
      expect(isExternalDeploymentsPath(deploymentsExternalPath())).toBe(true);
    });

    it('should match the external path with namespace', () => {
      expect(isExternalDeploymentsPath(deploymentsExternalPath('ai-tenants'))).toBe(true);
    });

    it('should match the legacy external tab path', () => {
      expect(
        isExternalDeploymentsPath(
          `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT}`,
        ),
      ).toBe(true);
    });

    it('should match the legacy external tab path with trailing segment', () => {
      expect(
        isExternalDeploymentsPath(
          `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT}/details`,
        ),
      ).toBe(true);
    });

    it('should not match internal paths', () => {
      expect(isExternalDeploymentsPath(deploymentsInternalPath('ai-tenants'))).toBe(false);
    });

    it('should not match legacy flat namespace paths', () => {
      expect(isExternalDeploymentsPath(deploymentsLegacyPath('ai-tenants'))).toBe(false);
    });

    it('should not match namespaces prefixed with external', () => {
      expect(isExternalDeploymentsPath(deploymentsLegacyPath('external-team'))).toBe(false);
      expect(isExternalDeploymentsPath(deploymentsInternalPath('external-team'))).toBe(false);
    });

    it('should not match namespaces that extend the external tab segment', () => {
      expect(isExternalDeploymentsPath(deploymentsLegacyPath('external-models2'))).toBe(false);
    });

    it('should not match malformed paths', () => {
      expect(isExternalDeploymentsPath('/ai-hub/models/deployments')).toBe(false);
      expect(isExternalDeploymentsPath('/ai-hub/models/deployments/')).toBe(false);
      expect(isExternalDeploymentsPath('/wrong/base/external')).toBe(false);
    });
  });

  describe('getLegacyNamespaceFromPath', () => {
    it('should return a valid legacy namespace segment', () => {
      expect(getLegacyNamespaceFromPath(deploymentsLegacyPath('ai-tenants'))).toBe('ai-tenants');
    });

    it('should return undefined for the deployments base path', () => {
      expect(getLegacyNamespaceFromPath(DEPLOYMENTS_BASE_PATH)).toBeUndefined();
    });

    it('should return undefined for reserved segments', () => {
      expect(getLegacyNamespaceFromPath(deploymentsInternalPath())).toBeUndefined();
      expect(getLegacyNamespaceFromPath(deploymentsExternalPath())).toBeUndefined();
      expect(
        getLegacyNamespaceFromPath(
          `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT}`,
        ),
      ).toBeUndefined();
    });

    it('should return namespaces that look like external paths but are flat legacy segments', () => {
      expect(getLegacyNamespaceFromPath(deploymentsLegacyPath('external-team'))).toBe(
        'external-team',
      );
      expect(getLegacyNamespaceFromPath(deploymentsLegacyPath('external-models2'))).toBe(
        'external-models2',
      );
    });

    it('should return undefined for malformed paths', () => {
      expect(
        getLegacyNamespaceFromPath(`${DEPLOYMENTS_BASE_PATH}/ai-tenants/metrics`),
      ).toBeUndefined();
      expect(getLegacyNamespaceFromPath('/wrong/base/ai-tenants')).toBeUndefined();
    });
  });
});
