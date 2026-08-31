import {
  agentDeploymentsPath,
  agentOpsDeploymentDetailRoute,
  agentOpsDeploymentsRoute,
  getAgentDeployWizardRoute,
  isSafeAgentOpsInternalRoute,
  nativeProviderPath,
  openShellProviderPath,
  openShellSandboxRoute,
  sanitizeAgentOpsReturnRoute,
} from '~/app/utilities/routes';

describe('agent-ops routes', () => {
  it('builds the canonical provider hierarchy', () => {
    expect(agentDeploymentsPath).toBe('/ai-hub/agents/deployments');
    expect(openShellProviderPath).toBe('/ai-hub/agents/deployments/providers/openshell');
    expect(agentOpsDeploymentsRoute('team 1')).toBe(
      '/ai-hub/agents/deployments/providers/native/projects/team%201',
    );
    expect(agentOpsDeploymentDetailRoute('team1', 'agent 1')).toBe(
      '/ai-hub/agents/deployments/providers/native/projects/team1/sandboxes/agent%201',
    );
    expect(getAgentDeployWizardRoute('team1')).toBe(
      '/ai-hub/agents/deployments/providers/native/projects/team1/create',
    );
    expect(openShellSandboxRoute('default', 'dev python', 'terminal')).toBe(
      '/ai-hub/agents/deployments/providers/openshell/workspaces/default/sandboxes/dev%20python?tab=terminal',
    );
  });

  describe('isSafeAgentOpsInternalRoute', () => {
    it('accepts native provider paths', () => {
      expect(isSafeAgentOpsInternalRoute(agentOpsDeploymentsRoute('team1'))).toBe(true);
      expect(isSafeAgentOpsInternalRoute(agentOpsDeploymentDetailRoute('team1', 'agent'))).toBe(
        true,
      );
    });

    it('rejects other Agents products', () => {
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/catalog')).toBe(false);
      expect(isSafeAgentOpsInternalRoute(openShellProviderPath)).toBe(false);
    });

    it('rejects external and malformed paths', () => {
      expect(isSafeAgentOpsInternalRoute('https://evil.com')).toBe(false);
      expect(isSafeAgentOpsInternalRoute('//evil.com')).toBe(false);
      expect(isSafeAgentOpsInternalRoute(`${nativeProviderPath}/foo/../../other`)).toBe(false);
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents\\deployments')).toBe(false);
      expect(isSafeAgentOpsInternalRoute(`${nativeProviderPath}/team1\n/evil`)).toBe(false);
      expect(isSafeAgentOpsInternalRoute(`${nativeProviderPath}\tteam1`)).toBe(false);
      expect(isSafeAgentOpsInternalRoute(123)).toBe(false);
    });

    it('returns false when URL parsing throws', () => {
      const urlSpy = jest.spyOn(global, 'URL').mockImplementation(() => {
        throw new TypeError('Invalid URL');
      });

      expect(isSafeAgentOpsInternalRoute(agentOpsDeploymentsRoute('team1'))).toBe(false);
      urlSpy.mockRestore();
    });
  });

  describe('sanitizeAgentOpsReturnRoute', () => {
    it('returns a safe native route unchanged', () => {
      const route = agentOpsDeploymentsRoute('team1');
      expect(sanitizeAgentOpsReturnRoute(route, 'team1')).toBe(route);
    });

    it('falls back to the canonical project route for unsafe paths', () => {
      expect(sanitizeAgentOpsReturnRoute('https://evil.com', 'team1')).toBe(
        agentOpsDeploymentsRoute('team1'),
      );
    });
  });
});
