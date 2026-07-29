import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  resolveDeployWizardCancelRoute,
  useExitDeployAgentWizard,
} from '~/app/deployWizard/useExitDeployAgentWizard';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('resolveDeployWizardCancelRoute', () => {
  it('uses returnRoute when project matches entry namespace', () => {
    expect(
      resolveDeployWizardCancelRoute({
        namespace: 'team1',
        entryNamespace: 'team1',
        returnRoute: '/ai-hub/agents/deployments/team1/my-agent',
      }),
    ).toBe('/ai-hub/agents/deployments/team1/my-agent');
  });

  it('falls back to current project deployments when project changed', () => {
    expect(
      resolveDeployWizardCancelRoute({
        namespace: 'team2',
        entryNamespace: 'team1',
        returnRoute: '/ai-hub/agents/deployments/team1/my-agent',
      }),
    ).toBe('/ai-hub/agents/deployments/team2');
  });
});

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
          entryNamespace: 'team1',
          isDirty: false,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizard();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team2');
  });

  it('navigates to returnRoute on cancel when provided and project unchanged', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team1',
          entryNamespace: 'team1',
          returnRoute: '/ai-hub/agents/deployments/team1/my-agent',
          isDirty: false,
        }),
      { wrapper: MemoryRouter },
    );

    result.current.exitWizard();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1/my-agent');
  });

  it('ignores returnRoute when project changed from entry namespace', () => {
    const { result } = renderHook(
      () =>
        useExitDeployAgentWizard({
          namespace: 'team2',
          entryNamespace: 'team1',
          returnRoute: '/ai-hub/agents/deployments/team1/my-agent',
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
