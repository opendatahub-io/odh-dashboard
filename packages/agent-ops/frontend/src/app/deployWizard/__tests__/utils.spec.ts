import {
  deriveAgentNameFromImage,
  buildFullImageReference,
  isValidAgentName,
  isValidK8sStorageQuantity,
  isValidPullSecretName,
  stripContainerImageTag,
} from '~/app/deployWizard/utils';

describe('deployWizard utils', () => {
  describe('deriveAgentNameFromImage', () => {
    it('derives DNS-1123 name from last image path segment', () => {
      expect(deriveAgentNameFromImage('quay.io/myorg/my-agent')).toBe('my-agent');
    });

    it('returns empty string for empty input', () => {
      expect(deriveAgentNameFromImage('')).toBe('');
    });
  });

  describe('buildFullImageReference', () => {
    it('combines image and tag', () => {
      expect(buildFullImageReference('quay.io/myorg/my-agent', 'latest')).toBe(
        'quay.io/myorg/my-agent:latest',
      );
    });
  });

  describe('isValidK8sStorageQuantity', () => {
    it('accepts valid quantities', () => {
      expect(isValidK8sStorageQuantity('1Gi')).toBe(true);
      expect(isValidK8sStorageQuantity('512Mi')).toBe(true);
    });

    it('rejects invalid quantities', () => {
      expect(isValidK8sStorageQuantity('1 GB')).toBe(false);
      expect(isValidK8sStorageQuantity('')).toBe(false);
    });
  });

  describe('isValidAgentName', () => {
    it('accepts valid DNS-1123 labels', () => {
      expect(isValidAgentName('my-agent')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidAgentName('My_Agent!')).toBe(false);
      expect(isValidAgentName('')).toBe(false);
      expect(isValidAgentName('a'.repeat(64))).toBe(false);
    });
  });

  describe('isValidPullSecretName', () => {
    it('allows empty optional secret', () => {
      expect(isValidPullSecretName('')).toBe(true);
    });

    it('accepts DNS subdomain names with dots', () => {
      expect(isValidPullSecretName('pull-secret.dockerconfig')).toBe(true);
    });

    it('rejects invalid secret names', () => {
      expect(isValidPullSecretName('bad secret')).toBe(false);
      expect(isValidPullSecretName('My_Agent!')).toBe(false);
    });
  });

  describe('stripContainerImageTag', () => {
    it('removes tag from final path segment', () => {
      expect(stripContainerImageTag('quay.io/myorg/my-agent:v1')).toBe('quay.io/myorg/my-agent');
    });

    it('preserves digest-pinned references', () => {
      const digestImage = 'quay.io/myorg/my-agent@sha256:abcdef0123456789';
      expect(stripContainerImageTag(digestImage)).toBe(digestImage);
    });
  });
});
