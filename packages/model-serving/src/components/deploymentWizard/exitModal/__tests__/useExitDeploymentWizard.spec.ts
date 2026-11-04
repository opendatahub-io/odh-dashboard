import { act } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { fireModelDeployed } from '../../../../shared/tracking/deploymentTracking';
import type { UseModelDeploymentWizardState } from '../../useDeploymentWizard';
import { useExitDeploymentWizard } from '../useExitDeploymentWizard';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@odh-dashboard/plugin-core/host-api', () => ({ useTrackEvent: () => mockTrackEvent }));
jest.mock('../../../../shared/tracking/deploymentTracking', () => ({
  fireModelDeployed: jest.fn(),
}));

const createFormData = (deploymentMethod?: string): UseModelDeploymentWizardState =>
  ({
    state: {
      deploymentMethod: deploymentMethod === undefined ? undefined : { method: deploymentMethod },
    },
  } as unknown as UseModelDeploymentWizardState);

describe('useExitDeploymentWizard tracking', () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([false, true])('should include the selected method on cancel with edit=%s', (isEdit) => {
    const hook = renderHook(useExitDeploymentWizard, {
      initialProps: { isEdit, formData: createFormData('legacy'), returnRoute: '/projects/test' },
    });
    act(() => hook.result.current.handleExitConfirm());
    expect(fireModelDeployed).toHaveBeenCalledWith(
      mockTrackEvent,
      { outcome: 'cancel', deploymentMethod: 'legacy' },
      isEdit,
    );
    expect(mockNavigate).toHaveBeenCalledWith('/projects/test');
  });
  it('should use the current selection and omit it before selection', () => {
    const hook = renderHook(useExitDeploymentWizard, {
      initialProps: { formData: createFormData() },
    });
    act(() => hook.result.current.handleExitConfirm());
    expect(fireModelDeployed).toHaveBeenLastCalledWith(
      mockTrackEvent,
      { outcome: 'cancel' },
      undefined,
    );
    hook.rerender({ formData: createFormData('llm-inference-service-llmd') });
    act(() => hook.result.current.handleExitConfirm());
    expect(fireModelDeployed).toHaveBeenLastCalledWith(
      mockTrackEvent,
      { outcome: 'cancel', deploymentMethod: 'llm-inference-service-llmd' },
      undefined,
    );
  });

  it('should omit an empty deployment method on cancel', () => {
    const hook = renderHook(useExitDeploymentWizard, {
      initialProps: { formData: createFormData('') },
    });
    act(() => hook.result.current.handleExitConfirm());
    expect(fireModelDeployed).toHaveBeenLastCalledWith(
      mockTrackEvent,
      { outcome: 'cancel' },
      undefined,
    );
  });
});
