import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockInferenceServiceK8sResource } from '../../../__mocks__/mockInferenceServiceK8sResource';
import { ModelDeploymentsContext } from '../../../concepts/ModelDeploymentsContext';
import type { Deployment } from '../../../../extension-points';
import { useRefreshWizardPage } from '../useRefreshWizardPage';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: () => ({ pathname: '/wizard', state: { returnRoute: '/back' } }),
}));

jest.mock('../useExtractFormDataFromDeployment', () => ({
  useExtractFormDataFromDeployment: () => ({ formData: { name: 'fresh' }, loaded: true }),
}));

const navigate = jest.fn();
const NAMESPACE = 'test-project';

const deploymentWithPods = (name = 'dra-model'): Deployment => ({
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ name, namespace: NAMESPACE }),
  pods: {
    data: [mockPodK8sResource({ name: `${name}-predictor-0`, namespace: NAMESPACE })],
    loaded: true,
    containerNames: ['kserve-container'],
  },
});

const renderWithDeployments = (existing: Deployment | undefined, deployments?: Deployment[]) =>
  renderHook(() => useRefreshWizardPage(existing), {
    wrapper: ({ children }) => (
      <ModelDeploymentsContext.Provider value={{ deployments, loaded: true }}>
        {children}
      </ModelDeploymentsContext.Provider>
    ),
  });

describe('useRefreshWizardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigate).mockReturnValue(navigate);
  });

  it('should return undefined when not editing', () => {
    expect(renderWithDeployments(undefined).result.current).toBeUndefined();
  });

  it('should re-navigate with the latest Pod-free deployment and fresh form data', () => {
    const existing = deploymentWithPods();
    const latest = deploymentWithPods();
    const { result } = renderWithDeployments(existing, [latest]);

    act(() => result.current?.());

    expect(navigate).toHaveBeenCalledTimes(1);
    const [path, options] = navigate.mock.calls[0];
    expect(path).toBe('/wizard');
    expect(options.replace).toBe(true);
    expect(options.state.returnRoute).toBe('/back');
    expect(options.state.initialData).toEqual({ name: 'fresh' });
    expect(options.state.existingDeployment.model).toBe(latest.model);
    expect(options.state.existingDeployment).not.toHaveProperty('pods');
    expect(() => structuredClone(options.state)).not.toThrow();
  });

  it('should fall back to the edited deployment, still without Pods, when no newer one is watched', () => {
    const existing = deploymentWithPods();
    const { result } = renderWithDeployments(existing, [deploymentWithPods('other-model')]);

    act(() => result.current?.());

    const { existingDeployment } = navigate.mock.calls[0][1].state;
    expect(existingDeployment.model).toBe(existing.model);
    expect(existingDeployment).not.toHaveProperty('pods');
  });
});
