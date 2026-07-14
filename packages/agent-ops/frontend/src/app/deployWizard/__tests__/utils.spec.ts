import {
  deriveAgentNameFromImage,
  buildFullImageReference,
  formatEnvVarsSummary,
  formatProtocolSummary,
  formatServicePortsSummary,
  getEnvVarNameError,
  getAgentNameError,
  getContainerImageError,
  getImageTagError,
  getProtocolError,
  getProjectError,
  getServicePortNameError,
  isSupportedDeployEnvVarRow,
  isValidAgentName,
  isValidEnvVarName,
  isValidK8sLabelValue,
  isValidK8sStorageQuantity,
  isValidPortNumber,
  isValidPullSecretName,
  isValidServicePortName,
  stripContainerImageTag,
  ENV_VAR_NAME_REQUIRED_ERROR,
  SERVICE_PORT_NAME_REQUIRED_ERROR,
} from '~/app/deployWizard/utils';
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

  describe('required field errors', () => {
    it('returns required messages for empty values', () => {
      expect(getContainerImageError('')).toBe('Container image is required');
      expect(getImageTagError('')).toBe('Image tag is required');
      expect(getAgentNameError('')).toBe('Agent name is required');
      expect(getProjectError('')).toBe('Project is required');
      expect(getProtocolError('')).toBe('Protocol is required');
    });

    it('returns format error for invalid agent names', () => {
      expect(getAgentNameError('Invalid_Name!')).toContain('DNS-1123');
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
      expect(isValidServicePortName('8080-tcp')).toBe(true);
      expect(isValidServicePortName('1http')).toBe(true);
      expect(isValidServicePortName('abcdefghijklmno')).toBe(true);
      expect(isValidServicePortName('bad name')).toBe(false);
      expect(isValidServicePortName('abcdefghijklmnop')).toBe(false);
      expect(isValidServicePortName('ab--cd')).toBe(false);
      expect(isValidServicePortName('-http')).toBe(false);
      expect(isValidServicePortName('http-')).toBe(false);
    });

    it('returns port name validation errors', () => {
      expect(getServicePortNameError('')).toBe(SERVICE_PORT_NAME_REQUIRED_ERROR);
      expect(getServicePortNameError('http')).toBe('');
      expect(getServicePortNameError('bad name')).toContain('IANA service name');
      expect(getServicePortNameError('abcdefghijklmnop')).toContain('IANA service name');
    });
  });

  describe('environment variable validators', () => {
    it('validates environment variable names', () => {
      expect(isValidEnvVarName('LOG_LEVEL')).toBe(true);
      expect(isValidEnvVarName('1BAD')).toBe(false);
    });

    it('returns required error for empty environment variable names', () => {
      expect(getEnvVarNameError('')).toBe(ENV_VAR_NAME_REQUIRED_ERROR);
      expect(getEnvVarNameError('LOG_LEVEL')).toBe('');
      expect(getEnvVarNameError('1BAD')).toContain('letter or underscore');
    });
  });

  describe('isValidK8sLabelValue', () => {
    it('accepts empty optional values', () => {
      expect(isValidK8sLabelValue('')).toBe(true);
      expect(isValidK8sLabelValue('   ')).toBe(true);
    });

    it('accepts valid framework labels', () => {
      expect(isValidK8sLabelValue('langgraph')).toBe(true);
      expect(isValidK8sLabelValue('my.framework_v1')).toBe(true);
    });

    it('rejects invalid framework labels', () => {
      expect(isValidK8sLabelValue('Invalid Framework')).toBe(false);
      expect(isValidK8sLabelValue('a'.repeat(64))).toBe(false);
    });
  });

  describe('summary formatters', () => {
    it('formats service ports', () => {
      expect(
        formatServicePortsSummary([
          { rowId: 'test-row', name: 'http', port: 8080, targetPort: 8000, protocol: 'TCP' },
        ]),
      ).toBe('http (TCP): 8080 → 8000');
    });

    it('formats environment variables', () => {
      expect(formatEnvVarsSummary([])).toBe('');
      expect(
        formatEnvVarsSummary([
          {
            ...DEFAULT_ENV_VAR,
            rowId: 'env-1',
            name: 'LOG_LEVEL',
            type: DeployAgentEnvVarType.DIRECT,
            value: 'info',
          },
        ]),
      ).toBe('LOG_LEVEL = (direct value)');
      expect(
        formatEnvVarsSummary([
          {
            ...DEFAULT_ENV_VAR,
            rowId: 'env-2',
            name: 'API_KEY',
            type: DeployAgentEnvVarType.SECRET,
            secretName: 'my-secret',
            secretKey: 'api-key',
          },
        ]),
      ).toBe('API_KEY = secret/my-secret:api-key');
      expect(
        formatEnvVarsSummary([
          {
            ...DEFAULT_ENV_VAR,
            rowId: 'env-3',
            name: 'INCOMPLETE',
            type: DeployAgentEnvVarType.SECRET,
            secretName: '',
            secretKey: 'api-key',
          },
        ]),
      ).toBe('');
    });

    it('formats protocol summary', () => {
      expect(formatProtocolSummary('a2a')).toBe('A2A (Agent-to-Agent)');
    });
  });

  describe('isSupportedDeployEnvVarRow', () => {
    it('accepts valid direct value rows', () => {
      expect(
        isSupportedDeployEnvVarRow({
          ...DEFAULT_ENV_VAR,
          rowId: 'env-1',
          name: 'LOG_LEVEL',
          type: DeployAgentEnvVarType.DIRECT,
          value: 'info',
        }),
      ).toBe(true);
    });

    it('rejects secret reference rows', () => {
      expect(
        isSupportedDeployEnvVarRow({
          ...DEFAULT_ENV_VAR,
          rowId: 'env-2',
          name: 'API_KEY',
          type: DeployAgentEnvVarType.SECRET,
          secretName: 'my-secret',
          secretKey: 'api-key',
        }),
      ).toBe(false);
    });
  });
});
