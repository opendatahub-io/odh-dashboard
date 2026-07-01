import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useExitDeployAgentWizard } from '~/app/deployWizard/useExitDeployAgentWizard';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('useExitDeployAgentWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to namespace deployments on cancel', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          isDirty: false,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizard();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });

  it('navigates to current namespace deployments on cancel when project changes', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team2',
          isDirty: false,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizard();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team2');
  });

  it('opens exit modal when form is dirty', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          isDirty: true,
        }),
      { wrapper: MemoryRouter },
    );

    act(() => {
      result.current.exitWizard();
    });

    expect(result.current.isExitModalOpen).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to return route on submit when form is valid', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          returnRoute: '/ai-hub/agents/deployments/team1',
          isDeployFormValid: true,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizardOnSubmit();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });

  it('does not navigate on submit when form is invalid', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          returnRoute: '/ai-hub/agents/deployments/team1',
          isDeployFormValid: false,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizardOnSubmit();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to namespace deployments route for unsafe returnRoute', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          returnRoute: 'https://evil.com',
          isDeployFormValid: true,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizardOnSubmit();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });

  it('closes exit modal without navigating', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          isDirty: true,
        }),
      { wrapper: MemoryRouter },
    );

    act(() => {
      result.current.exitWizard();
    });
    expect(result.current.isExitModalOpen).toBe(true);

    act(() => {
      result.current.closeExitModal();
    });
    expect(result.current.isExitModalOpen).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
