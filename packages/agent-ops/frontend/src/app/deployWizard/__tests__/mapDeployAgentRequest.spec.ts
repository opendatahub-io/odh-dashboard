import {
  buildDeployAgentRequest,
  UNSUPPORTED_ENV_VAR_TYPES_ERROR,
} from '~/app/deployWizard/mapDeployAgentRequest';
import type { DeployAgentWizardFormData } from '~/app/deployWizard/types';
import { DeployAgentEnvVarType } from '~/app/deployWizard/types';

const baseFormData = (): DeployAgentWizardFormData => ({
  project: 'team1',
  containerImage: 'quay.io/myorg/my-agent',
  imageTag: 'latest',
  agentName: 'my-agent',
  description: 'Customer support agent',
  pullSecret: '',
  fullImageReference: 'quay.io/myorg/my-agent:latest',
  protocol: 'a2a',
  framework: 'langgraph',
  workloadType: 'sandbox',
  enablePersistentStorage: false,
  persistentVolumeSize: '1Gi',
  servicePorts: [
    {
      rowId: 'port-1',
      name: 'http',
      port: 8080,
      targetPort: 8000,
      protocol: 'TCP',
    },
  ],
  envVars: [],
});

describe('buildDeployAgentRequest', () => {
  it('maps wizard form data to deploy request without auth fields', () => {
    const { request, error } = buildDeployAgentRequest(baseFormData());

    expect(error).toBeUndefined();
    expect(request).toEqual({
      name: 'my-agent',
      namespace: 'team1',
      containerImage: 'quay.io/myorg/my-agent',
      imageTag: 'latest',
      protocol: 'a2a',
      framework: 'langgraph',
      description: 'Customer support agent',
      servicePorts: [
        {
          name: 'http',
          port: 8080,
          targetPort: 8000,
          protocol: 'TCP',
        },
      ],
      envVars: [],
    });
  });

  it('strips image tag from container image', () => {
    const formData = {
      ...baseFormData(),
      containerImage: 'quay.io/myorg/my-agent:v9',
    };

    const { request } = buildDeployAgentRequest(formData);
    expect(request?.containerImage).toBe('quay.io/myorg/my-agent');
  });

  it('includes optional pull secret when set', () => {
    const formData = {
      ...baseFormData(),
      pullSecret: 'my-pull-secret',
    };

    const { request } = buildDeployAgentRequest(formData);
    expect(request?.imagePullSecret).toBe('my-pull-secret');
  });

  it('omits framework when empty', () => {
    const formData = {
      ...baseFormData(),
      framework: '',
    };

    const { request } = buildDeployAgentRequest(formData);
    expect(request?.framework).toBeUndefined();
  });

  it('omits description when empty', () => {
    const formData = {
      ...baseFormData(),
      description: '   ',
    };

    const { request } = buildDeployAgentRequest(formData);
    expect(request?.description).toBeUndefined();
  });

  it('maps direct environment variables only', () => {
    const formData = {
      ...baseFormData(),
      envVars: [
        {
          rowId: 'env-1',
          name: 'LOG_LEVEL',
          type: DeployAgentEnvVarType.DIRECT,
          value: 'info',
          secretName: '',
          secretKey: '',
          configMapName: '',
          configMapKey: '',
        },
      ],
    };

    const { request } = buildDeployAgentRequest(formData);
    expect(request?.envVars).toEqual([{ name: 'LOG_LEVEL', value: 'info' }]);
  });

  it('rejects secret reference environment variables', () => {
    const formData = {
      ...baseFormData(),
      envVars: [
        {
          rowId: 'env-1',
          name: 'API_KEY',
          type: DeployAgentEnvVarType.SECRET,
          value: '',
          secretName: 'my-secret',
          secretKey: 'token',
          configMapName: '',
          configMapKey: '',
        },
      ],
    };

    const { request, error } = buildDeployAgentRequest(formData);
    expect(request).toBeUndefined();
    expect(error).toBe(UNSUPPORTED_ENV_VAR_TYPES_ERROR);
  });
});
