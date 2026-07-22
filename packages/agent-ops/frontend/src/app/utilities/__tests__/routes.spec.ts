import {
  agentOpsDeploymentsRoute,
  isSafeAgentOpsInternalRoute,
  sanitizeAgentOpsReturnRoute,
} from '~/app/utilities/routes';

describe('agent-ops routes', () => {
  describe('isSafeAgentOpsInternalRoute', () => {
    it('accepts valid agent-ops paths', () => {
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/deployments/team1')).toBe(true);
    });

    it('rejects external URLs', () => {
      expect(isSafeAgentOpsInternalRoute('https://evil.com')).toBe(false);
    });

    it('rejects protocol-relative URLs', () => {
      expect(isSafeAgentOpsInternalRoute('//evil.com')).toBe(false);
    });

    it('rejects path traversal segments', () => {
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/deployments/foo/../../other')).toBe(false);
    });

    it('rejects backslash path segments', () => {
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents\\deployments')).toBe(false);
    });

    it('rejects control characters before URL parsing', () => {
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/deployments/team1\n/evil')).toBe(false);
      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/deployments\tteam1')).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(isSafeAgentOpsInternalRoute(123)).toBe(false);
    });

    it('returns false when URL parsing throws', () => {
      const urlSpy = jest.spyOn(global, 'URL').mockImplementation(() => {
        throw new TypeError('Invalid URL');
      });

      expect(isSafeAgentOpsInternalRoute('/ai-hub/agents/deployments/team1')).toBe(false);

      urlSpy.mockRestore();
    });
  });

  describe('sanitizeAgentOpsReturnRoute', () => {
    it('returns safe route unchanged', () => {
      expect(sanitizeAgentOpsReturnRoute('/ai-hub/agents/deployments/team1', 'team1')).toBe(
        '/ai-hub/agents/deployments/team1',
      );
    });

    it('falls back to deployments route for unsafe paths', () => {
      expect(sanitizeAgentOpsReturnRoute('https://evil.com', 'team1')).toBe(
        agentOpsDeploymentsRoute('team1'),
      );
    });
  });
});
