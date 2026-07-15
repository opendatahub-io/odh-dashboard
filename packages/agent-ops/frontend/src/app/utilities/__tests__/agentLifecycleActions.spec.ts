import {
  getAgentRuntimeLifecycleVisibility,
  getLifecycleErrorMessage,
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

    it('should show delete only for unknown runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('mystery')).toEqual({
        showRestart: false,
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

    it('should show delete only for failed runtimes', () => {
      expect(getAgentRuntimeLifecycleVisibility('Failed')).toEqual({
        showRestart: false,
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

  describe('getLifecycleErrorMessage', () => {
    it('should return permission message for forbidden errors', () => {
      expect(getLifecycleErrorMessage(new Error('Forbidden'))).toBe(
        'You do not have permission to perform this action.',
      );
      expect(getLifecycleErrorMessage(new Error('Error 403: Access denied'))).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('should return not found message for 404 errors', () => {
      expect(getLifecycleErrorMessage(new Error('Resource not found'))).toBe(
        'The agent deployment could not be found.',
      );
      expect(getLifecycleErrorMessage(new Error('404: Agent missing'))).toBe(
        'The agent deployment could not be found.',
      );
    });

    it('should return network message for connection errors', () => {
      expect(getLifecycleErrorMessage(new Error('Network error'))).toBe(
        'Unable to reach the server. Check your connection.',
      );
      expect(getLifecycleErrorMessage(new Error('Failed to fetch'))).toBe(
        'Unable to reach the server. Check your connection.',
      );
    });

    it('should return timeout message for timeout errors', () => {
      expect(getLifecycleErrorMessage(new Error('Request timeout'))).toBe(
        'The request timed out. Please try again.',
      );
    });

    it('should return generic message for unknown errors', () => {
      expect(getLifecycleErrorMessage(new Error('Something broke'))).toBe(
        'An error occurred. Please try again.',
      );
      expect(getLifecycleErrorMessage('string error')).toBe('An error occurred. Please try again.');
    });
  });
});
