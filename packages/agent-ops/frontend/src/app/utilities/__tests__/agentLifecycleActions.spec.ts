import {
  getAgentRuntimeLifecycleVisibility,
  isAgentRuntimeRunning,
} from '~/app/utilities/agentLifecycleActions';
import {
  AgentRuntimeDisplayStatus,
  mapAgentRuntimeStatus,
} from '~/app/utilities/agentRuntimeStatus';

describe('agentLifecycleActions', () => {
  describe('getAgentRuntimeLifecycleVisibility', () => {
    it('should show restart, stop, and delete for ready runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('Ready')).toEqual({
        showRestart: true,
        showStop: true,
        showDelete: true,
      });
    });

    it('should show restart and delete without stop for unknown runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('mystery')).toEqual({
        showRestart: true,
        showStop: false,
        showDelete: true,
      });
    });

    it('should show restart and delete without stop for stopped runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('Stopped')).toEqual({
        showRestart: true,
        showStop: false,
        showDelete: true,
      });
    });

    it('should hide restart for pending runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('Pending')).toEqual({
        showRestart: false,
        showStop: false,
        showDelete: true,
      });
    });

    it('should show restart and delete without stop for failed runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('Failed')).toEqual({
        showRestart: true,
        showStop: false,
        showDelete: true,
      });
    });
  });

  describe('isAgentRuntimeRunning', () => {
    it('should treat ready and running statuses as running', () => {
      expect(isAgentRuntimeRunning('Ready')).toBe(true);
      expect(isAgentRuntimeRunning('running')).toBe(true);
    });

    it('should treat unknown statuses as not running', () => {
      expect(isAgentRuntimeRunning('mystery')).toBe(false);
      expect(mapAgentRuntimeStatus('mystery').displayStatus).toBe(
        AgentRuntimeDisplayStatus.Unknown,
      );
    });

    it('should treat stopped, pending, and failed statuses as not running', () => {
      expect(isAgentRuntimeRunning('Stopped')).toBe(false);
      expect(isAgentRuntimeRunning('Pending')).toBe(false);
      expect(isAgentRuntimeRunning('Failed')).toBe(false);
    });
  });
});
