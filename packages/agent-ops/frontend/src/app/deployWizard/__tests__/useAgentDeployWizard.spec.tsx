import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  AgentDeployWizardProvider,
  useAgentDeployWizardContext,
} from '~/app/deployWizard/useAgentDeployWizard';

const NamespaceWrapper: React.FC<{ namespace: string; children: React.ReactNode }> = ({
  namespace,
  children,
}) => (
  <AgentDeployWizardProvider key={namespace} namespace={namespace}>
    {children}
  </AgentDeployWizardProvider>
);

describe('useAgentDeployWizard', () => {
  it('resets form and clears dirty state when namespace changes', async () => {
    let namespace = 'team1';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NamespaceWrapper namespace={namespace}>{children}</NamespaceWrapper>
    );

    const { result, rerender } = renderHook(() => useAgentDeployWizardContext(), { wrapper });

    act(() => {
      result.current.setFormField('containerImage', 'quay.io/myorg/my-agent');
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.formData.containerImage).toBe('quay.io/myorg/my-agent');

    namespace = 'team2';
    act(() => {
      rerender();
    });

    await waitFor(() => {
      expect(result.current.formData.project).toBe('team2');
      expect(result.current.formData.containerImage).toBe('');
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('exposes a stable provider when namespace is unchanged', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentDeployWizardProvider namespace="team1">{children}</AgentDeployWizardProvider>
    );
    const { result, rerender } = renderHook(() => useAgentDeployWizardContext(), { wrapper });

    act(() => {
      result.current.setFormField('agentName', 'custom-agent');
    });

    rerender();
    expect(result.current.formData.agentName).toBe('custom-agent');
  });
});
