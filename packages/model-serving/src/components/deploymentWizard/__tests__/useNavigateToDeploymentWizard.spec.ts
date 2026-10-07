import { act } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { mockInferenceServiceK8sResource } from '../../../__mocks__/mockInferenceServiceK8sResource';
import type { Deployment } from '../../../../extension-points';
import {
  toWizardDeploymentState,
  useNavigateToDeploymentWizard,
} from '../useNavigateToDeploymentWizard';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: () => ({ pathname: '/ai-hub/models/deployments' }),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useTrackEvent: () => jest.fn(),
}));

jest.mock('../useExtractFormDataFromDeployment', () => ({
  useExtractFormDataFromDeployment: () => ({ formData: undefined, loaded: true, error: undefined }),
}));

const navigate = jest.fn();

const deploymentWithPods = (): Deployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ name: 'dra-model', namespace: 'test-project' }),
  pods: {
    data: [mockPodK8sResource({ name: 'dra-model-predictor-0', namespace: 'test-project' })],
    loaded: true,
    containerNames: ['kserve-container'],
    podDescriptions: { 'dra-model-predictor-0': 'decode' },
  },
});

describe('toWizardDeploymentState', () => {
  it('should drop the Pods and keep every other field', () => {
    const deployment = deploymentWithPods();

    const state = toWizardDeploymentState(deployment);

    expect(state).not.toHaveProperty('pods');
    expect(state).toStrictEqual({
      modelServingPlatformId: deployment.modelServingPlatformId,
      model: deployment.model,
    });
    // The watched deployment itself is left untouched.
    expect(deployment.pods?.data).toHaveLength(1);
  });

  it('should return an equivalent object for a deployment without Pods', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'kserve',
      model: mockInferenceServiceK8sResource({}),
    };
    expect(toWizardDeploymentState(deployment)).toStrictEqual(deployment);
  });
});

describe('useNavigateToDeploymentWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(navigate);
    jest.mocked(useIsAreaAvailable).mockReturnValue({
      status: false,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredComponents: null,
      requiredCapabilities: null,
      customCondition: () => false,
    });
  });

  it('should put a Pod-free deployment into the router state when editing', () => {
    const deployment = deploymentWithPods();
    const renderResult = testHook(useNavigateToDeploymentWizard)(deployment);

    act(() => renderResult.result.current('test-project'));

    expect(navigate).toHaveBeenCalledTimes(1);
    const [, options] = navigate.mock.calls[0];
    expect(options.state.editMode).toBe(true);
    expect(options.state.projectName).toBe('test-project');
    expect(options.state.existingDeployment).not.toHaveProperty('pods');
    expect(options.state.existingDeployment.model).toBe(deployment.model);
    // Everything in the state survives structured cloning into history.
    expect(() => structuredClone(options.state)).not.toThrow();
  });

  it('should leave existingDeployment undefined when creating', () => {
    const renderResult = testHook(useNavigateToDeploymentWizard)();

    act(() => renderResult.result.current('test-project'));

    expect(navigate.mock.calls[0][1].state.existingDeployment).toBeUndefined();
    expect(navigate.mock.calls[0][1].state.editMode).toBe(false);
  });
});
