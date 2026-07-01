import {
  deriveAgentNameFromImage,
  buildFullImageReference,
  formatAuthBridgeSummary,
  formatEnvVarsSummary,
  formatServicePortsSummary,
  isValidAgentName,
  isValidEnvVarName,
  isValidK8sStorageQuantity,
  isValidPortNumber,
  isValidPullSecretName,
  isValidServicePortName,
  stripContainerImageTag,
} from '~/app/deployWizard/utils';
import type { DeployAgentWizardFormData } from '~/app/deployWizard/types';
import { createInitialFormData } from '~/app/deployWizard/useAgentDeployWizard';
import { DeployAgentEnvVarType } from '~/app/deployWizard/types';
import { DEFAULT_ENV_VAR } from '~/app/deployWizard/wizardOptions';

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

  describe('service port validators', () => {
    it('validates port numbers', () => {
      expect(isValidPortNumber(8080)).toBe(true);
      expect(isValidPortNumber(0)).toBe(false);
      expect(isValidPortNumber(70000)).toBe(false);
    });

    it('validates service port names', () => {
      expect(isValidServicePortName('http')).toBe(true);
      expect(isValidServicePortName('bad name')).toBe(false);
    });
  });

  describe('environment variable validators', () => {
    it('validates environment variable names', () => {
      expect(isValidEnvVarName('LOG_LEVEL')).toBe(true);
      expect(isValidEnvVarName('1BAD')).toBe(false);
    });
  });

  describe('summary formatters', () => {
    it('formats service ports', () => {
      expect(
        formatServicePortsSummary([
          { name: 'http', port: 8080, targetPort: 8000, protocol: 'TCP' },
        ]),
      ).toBe('http (TCP): 8080 → 8000');
    });

    it('formats auth bridge summary', () => {
      const formData: DeployAgentWizardFormData = {
        ...createInitialFormData('team1'),
        authBridgeEnabled: true,
        useEnvoySidecar: true,
      };

      expect(formatAuthBridgeSummary(formData)).toBe('Enabled (envoy-sidecar)');
    });

    it('formats environment variables', () => {
      expect(formatEnvVarsSummary([])).toBe('');
      expect(
        formatEnvVarsSummary([
          {
            ...DEFAULT_ENV_VAR,
            name: 'LOG_LEVEL',
            type: DeployAgentEnvVarType.DIRECT,
            value: 'info',
          },
        ]),
      ).toBe('LOG_LEVEL = info');
      expect(
        formatEnvVarsSummary([
          {
            ...DEFAULT_ENV_VAR,
            name: 'API_KEY',
            type: DeployAgentEnvVarType.SECRET,
            secretName: 'my-secret',
            secretKey: 'api-key',
          },
        ]),
      ).toBe('API_KEY = secret/my-secret:api-key');
    });
  });
});
