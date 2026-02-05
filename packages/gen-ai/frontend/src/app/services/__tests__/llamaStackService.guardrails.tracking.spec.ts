/* eslint-disable camelcase */
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { createResponse } from '~/app/services/llamaStackService';
import { URL_PREFIX } from '~/app/utilities';
import { TEST_NAMESPACE, mockStreamingRequest } from './llamaStackService.fixtures';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

// Mock mod-arch-core
jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  restGET: jest.fn(),
  restCREATE: jest.fn(),
  restDELETE: jest.fn(),
}));

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('llamaStackService - Guardrail Violation Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Guardrail Activated Event', () => {
    it('should fire tracking event when guardrail violation is detected in streaming response', async () => {
      const mockStreamData = jest.fn();

      // Mock ReadableStream with refusal.delta events
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "I cannot process", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " that request", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "response.refusal.done"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.completed", "response": {"id": "test-response", "model": "test-model", "status": "completed", "created_at": 1234567890, "content": [{"type": "refusal", "refusal": "I cannot process that request"}]}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
        onStreamData: mockStreamData,
      });

      // Verify tracking event was fired
      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Activated', {
        ViolationDetected: true,
      });

      // Verify it was only called once (on first refusal)
      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    });

    it('should fire tracking event only once for multiple refusal delta chunks', async () => {
      const mockStreamData = jest.fn();

      // Mock ReadableStream with multiple refusal.delta events
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "I cannot", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " process that", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " request as it", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " violates safety guidelines.", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "response.refusal.done"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.completed", "response": {"id": "test-response", "model": "test-model", "status": "completed", "created_at": 1234567890, "content": [{"type": "refusal", "refusal": "I cannot process that request as it violates safety guidelines."}]}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
        onStreamData: mockStreamData,
      });

      // Verify tracking event was fired only once on first refusal
      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Activated', {
        ViolationDetected: true,
      });
      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);

      // Verify stream data callback received all chunks with clearPrevious on first
      expect(mockStreamData).toHaveBeenNthCalledWith(1, 'I cannot', true);
      expect(mockStreamData).toHaveBeenNthCalledWith(2, ' process that', false);
      expect(mockStreamData).toHaveBeenNthCalledWith(3, ' request as it', false);
      expect(mockStreamData).toHaveBeenNthCalledWith(4, ' violates safety guidelines.', false);
    });

    it('should not fire tracking event for normal responses without guardrail violations', async () => {
      const mockStreamData = jest.fn();

      // Mock ReadableStream with normal output_text.delta events (no refusal)
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "This is", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " a normal response", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "response.output_text.done"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.completed", "response": {"id": "test-response", "model": "test-model", "status": "completed", "created_at": 1234567890, "content": [{"type": "output_text", "text": "This is a normal response"}]}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
        onStreamData: mockStreamData,
      });

      // Verify tracking event was NOT fired for normal responses
      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();

      // Verify normal stream data was received without clearPrevious flag
      expect(mockStreamData).toHaveBeenNthCalledWith(1, 'This is');
      expect(mockStreamData).toHaveBeenNthCalledWith(2, ' a normal response');
    });

    it('should fire tracking event when response starts normal but then gets refused', async () => {
      const mockStreamData = jest.fn();

      // Mock ReadableStream with output_text.delta followed by refusal.delta
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "Let me help", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": " you with", "type": "response.output_text.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "I cannot process that request", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "response.refusal.done"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.completed", "response": {"id": "test-response", "model": "test-model", "status": "completed", "created_at": 1234567890, "content": [{"type": "refusal", "refusal": "I cannot process that request"}]}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
        onStreamData: mockStreamData,
      });

      // Verify tracking event was fired when refusal started
      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Activated', {
        ViolationDetected: true,
      });
      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);

      // Verify stream data shows normal output, then refusal with clearPrevious
      expect(mockStreamData).toHaveBeenNthCalledWith(1, 'Let me help');
      expect(mockStreamData).toHaveBeenNthCalledWith(2, ' you with');
      expect(mockStreamData).toHaveBeenNthCalledWith(3, 'I cannot process that request', true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty refusal delta without errors', async () => {
      const mockStreamData = jest.fn();

      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"delta": "Violation message", "type": "response.refusal.delta"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type": "response.refusal.done"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type": "response.completed", "response": {"id": "test-response", "model": "test-model", "status": "completed", "created_at": 1234567890, "content": [{"type": "refusal", "refusal": "Violation message"}]}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await createResponse(URL_PREFIX, { namespace: TEST_NAMESPACE })(mockStreamingRequest, {
        onStreamData: mockStreamData,
      });

      // Should still fire tracking event on first refusal even if delta is empty
      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('Guardrail Activated', {
        ViolationDetected: true,
      });
      expect(fireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    });
  });
});
