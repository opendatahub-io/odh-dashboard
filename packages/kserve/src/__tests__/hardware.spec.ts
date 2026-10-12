import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { extractHardwareProfileConfig } from '../hardware';
import type { KServeDeployment } from '../types';

const kserveDeployment = (
  hardwareProfileName: string,
  hardwareProfileNamespace?: string,
): KServeDeployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ hardwareProfileName, hardwareProfileNamespace }),
});

describe('extractHardwareProfileConfig', () => {
  it('should resolve a name-only hardware profile in the deployment namespace', () => {
    const [name, , , , , namespace, hardwareProfileNamespace] = extractHardwareProfileConfig(
      kserveDeployment('dra-profile'),
    );

    expect(name).toBe('dra-profile');
    expect(namespace).toBe('test-project');
    expect(hardwareProfileNamespace).toBe('test-project');
  });

  it('should keep the hardware profile namespace annotation when it is set', () => {
    const [name, , , , , , hardwareProfileNamespace] = extractHardwareProfileConfig(
      kserveDeployment('dra-profile', 'opendatahub'),
    );

    expect(name).toBe('dra-profile');
    expect(hardwareProfileNamespace).toBe('opendatahub');
  });
});
