import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { createPvc } from '@odh-dashboard/internal/api';
import { AccessMode } from '@odh-dashboard/k8s-core';
import {
  NIMPVCStorageMode,
  type NIMPVCFieldValue,
} from '../../../pages/deploymentWizard/fields/NIMPVCField';
import { DEFAULT_STORAGE_SIZE_GI } from '../../../constants';
import { nimPVCPreDeploy } from '../nimPVCDeployFunctions';

jest.mock('@odh-dashboard/internal/api', () => ({
  createPvc: jest.fn(),
}));

const mockCreatePvc = jest.mocked(createPvc);

const makeDeployment = (): KServeDeployment => ({
  modelServingPlatformId: 'nvidia-nim',
  model: mockInferenceServiceK8sResource({ name: 'test-nim' }),
});

const makeWizardState = (projectName = 'test-project'): WizardFormData['state'] =>
  ({ project: { projectName } } as unknown as WizardFormData['state']);

const makeFieldValue = (overrides?: Partial<NIMPVCFieldValue>): NIMPVCFieldValue => ({
  storageMode: NIMPVCStorageMode.NEW,
  pvcName: 'my-nim-pvc',
  subPath: '',
  storageClassName: 'gp3-csi',
  storageSizeGi: DEFAULT_STORAGE_SIZE_GI,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCreatePvc.mockResolvedValue({
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: { name: 'my-nim-pvc', namespace: 'test-project' },
    spec: {
      accessModes: [AccessMode.RWO],
      resources: { requests: { storage: '50Gi' } },
      volumeMode: 'Filesystem' as const,
    },
    status: { phase: 'Pending' },
  });
});

describe('nimPVCPreDeploy', () => {
  it('should throw when project is not set', async () => {
    const wizardState = makeWizardState('');
    await expect(nimPVCPreDeploy(makeFieldValue(), wizardState, makeDeployment())).rejects.toThrow(
      'Project is required',
    );
  });

  it('should skip PVC creation for EXISTING mode', async () => {
    const deployment = makeDeployment();
    const result = await nimPVCPreDeploy(
      makeFieldValue({ storageMode: NIMPVCStorageMode.EXISTING }),
      makeWizardState(),
      deployment,
    );
    expect(mockCreatePvc).not.toHaveBeenCalled();
    expect(result).toBe(deployment);
  });

  it('should create PVC for NEW mode', async () => {
    await nimPVCPreDeploy(makeFieldValue(), makeWizardState(), makeDeployment());
    expect(mockCreatePvc).toHaveBeenCalledTimes(1);
    expect(mockCreatePvc).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'my-nim-pvc',
        size: '50Gi',
        storageClassName: 'gp3-csi',
      }),
      'test-project',
      { dryRun: false },
      false,
      expect.objectContaining({ 'dashboard.opendatahub.io/nim-pvc': 'true' }),
      { 'opendatahub.io/managed': 'true' },
    );
  });

  it('should pass dryRun flag to createPvc', async () => {
    await nimPVCPreDeploy(makeFieldValue(), makeWizardState(), makeDeployment(), undefined, true);
    expect(mockCreatePvc).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { dryRun: true },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should include subPath annotation when subPath is set', async () => {
    await nimPVCPreDeploy(
      makeFieldValue({ subPath: 'models/llama' }),
      makeWizardState(),
      makeDeployment(),
    );
    expect(mockCreatePvc).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        'dashboard.opendatahub.io/nim-subpath': 'models/llama',
      }),
      expect.anything(),
    );
  });

  it('should not include subPath annotation when subPath is empty', async () => {
    await nimPVCPreDeploy(makeFieldValue({ subPath: '' }), makeWizardState(), makeDeployment());
    const annotations = mockCreatePvc.mock.calls[0][4];
    expect(annotations).not.toHaveProperty('dashboard.opendatahub.io/nim-subpath');
  });

  it('should return the deployment unchanged', async () => {
    const deployment = makeDeployment();
    const result = await nimPVCPreDeploy(makeFieldValue(), makeWizardState(), deployment);
    expect(result).toBe(deployment);
  });
});
