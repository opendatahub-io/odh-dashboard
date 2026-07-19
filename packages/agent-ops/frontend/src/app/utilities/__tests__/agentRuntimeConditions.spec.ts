import { AgentRuntimeCondition } from '~/app/types/agentRuntimes';
import { getAgentRuntimeStatusMessage } from '~/app/utilities/agentRuntimeConditions';

describe('getAgentRuntimeStatusMessage', () => {
  const lastTransitionTime = '2026-05-12T16:00:03.214610Z';

  it('should return Ready condition message when not true', () => {
    const conditions: AgentRuntimeCondition[] = [
      {
        type: 'Ready',
        status: 'False',
        reason: 'SandboxProvisioning',
        message: 'Sandbox is provisioning.',
        lastTransitionTime,
      },
    ];

    expect(getAgentRuntimeStatusMessage(conditions)).toBe('Sandbox is provisioning.');
  });

  it('should fall back to Ready reason when message is absent', () => {
    const conditions: AgentRuntimeCondition[] = [
      {
        type: 'Ready',
        status: 'False',
        reason: 'SandboxProvisioning',
        lastTransitionTime,
      },
    ];

    expect(getAgentRuntimeStatusMessage(conditions)).toBe('SandboxProvisioning');
  });

  it('should return Ready condition message when Ready is true', () => {
    const conditions: AgentRuntimeCondition[] = [
      {
        type: 'Ready',
        status: 'True',
        message: 'Sandbox is ready.',
        lastTransitionTime,
      },
      {
        type: 'Available',
        status: 'False',
        message: 'Service endpoint is not available yet.',
        lastTransitionTime,
      },
    ];

    expect(getAgentRuntimeStatusMessage(conditions)).toBe('Sandbox is ready.');
  });

  it('should not return other condition messages when Ready is true', () => {
    const conditions: AgentRuntimeCondition[] = [
      {
        type: 'Available',
        status: 'False',
        message: 'Service endpoint is not available yet.',
        lastTransitionTime,
      },
      {
        type: 'Ready',
        status: 'True',
        lastTransitionTime,
      },
    ];

    expect(getAgentRuntimeStatusMessage(conditions)).toBeUndefined();
  });

  it('should return undefined when conditions are empty', () => {
    expect(getAgentRuntimeStatusMessage([])).toBeUndefined();
    expect(getAgentRuntimeStatusMessage(undefined)).toBeUndefined();
  });
});
