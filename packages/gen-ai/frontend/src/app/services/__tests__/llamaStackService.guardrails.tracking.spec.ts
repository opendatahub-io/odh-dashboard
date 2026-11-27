/* eslint-disable camelcase */
import { ReadableStream } from 'stream/web';
import type { TrackEvent } from '@odh-dashboard/analytics/types';
import { createResponse } from '~/app/services/llamaStackService';
import { URL_PREFIX } from '~/app/utilities';
import { TEST_NAMESPACE, mockStreamingRequest } from './llamaStackService.fixtures';

const trackEvent = jest.fn();

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

      await createResponse(trackEvent, URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockStreamingRequest,
        {
          onStreamData: mockStreamData,
        },
      );

      // Verify tracking event was fired
      expect(trackEvent).toHaveBeenCalledWith('Guardrail Activated', {
        violationDetected: true,
      });

      // Verify it was only called once (on first refusal)
      expect(trackEvent).toHaveBeenCalledTimes(1);
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

      await createResponse(trackEvent, URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockStreamingRequest,
        {
          onStreamData: mockStreamData,
        },
      );

      // Verify tracking event was fired only once on first refusal
      expect(trackEvent).toHaveBeenCalledWith('Guardrail Activated', {
        violationDetected: true,
      });
      expect(trackEvent).toHaveBeenCalledTimes(1);

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

      await createResponse(trackEvent, URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockStreamingRequest,
        {
          onStreamData: mockStreamData,
        },
      );

      // Verify tracking event was NOT fired for normal responses
      expect(trackEvent).not.toHaveBeenCalled();

      // Verify normal stream data was received without clearPrevious flag
      expect(mockStreamData).toHaveBeenNthCalledWith(1, 'This is');
      expect(mockStreamData).toHaveBeenNthCalledWith(2, ' a normal response');
    });

    it('should reject stream with guardrail error when refusal arrives after content', async () => {
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
            done: true,
            value: undefined,
          }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      // Stream should reject when refusal arrives after content has been streamed
      await expect(
        createResponse(trackEvent, URL_PREFIX, { namespace: TEST_NAMESPACE })(
          mockStreamingRequest,
          {
            onStreamData: mockStreamData,
          },
        ),
      ).rejects.toMatchObject({
        error: expect.objectContaining({
          code: 'guardrail_output_violation',
          component: 'guardrails',
        }),
      });

      // Verify tracking event was fired
      expect(trackEvent).toHaveBeenCalledWith('Guardrail Activated', {
        violationDetected: true,
      });

      // Verify stream was cancelled to release resources
      expect(mockReader.cancel).toHaveBeenCalledWith('Output guardrail violation');

      // Verify safe content was streamed (NOT cleared) before rejection
      expect(mockStreamData).toHaveBeenNthCalledWith(1, 'Let me help');
      expect(mockStreamData).toHaveBeenNthCalledWith(2, ' you with');
      // onStreamData should NOT have been called with clearPrevious=true
      expect(mockStreamData).toHaveBeenCalledTimes(2);
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

      await createResponse(trackEvent, URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockStreamingRequest,
        {
          onStreamData: mockStreamData,
        },
      );

      // Tracking fires on the subsequent non-empty delta, not the empty one.
      // The service checks data.type === 'response.refusal.delta' first, then guards
      // content appending and tracking with if (data.delta). Empty-string deltas are
      // falsy, so receivedRefusal flag is set only when the first non-empty delta arrives.
      expect(trackEvent).toHaveBeenCalledWith('Guardrail Activated', {
        violationDetected: true,
      });
      expect(trackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Additional streaming guardrail paths', () => {
    const runStream = (events: object[], trailing: boolean, tracking: TrackEvent = trackEvent) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          events.forEach((event, index) => {
            const suffix = trailing && index === events.length - 1 ? '' : '\n';
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}${suffix}`));
          });
          controller.close();
        },
      });
      mockFetch.mockResolvedValueOnce({ ok: true, body });
      const onStreamData = jest.fn();
      const completion = createResponse(tracking, URL_PREFIX, { namespace: TEST_NAMESPACE })(
        mockStreamingRequest,
        { onStreamData },
      );
      return { completion, onStreamData };
    };

    it.each([false, true])(
      'should preserve output-violation rejection when tracking throws (trailing: %s)',
      async (trailing) => {
        const throwingTrackEvent = jest.fn(() => {
          throw new Error('Tracking unavailable');
        });
        const error = {
          code: 'guardrail_output_violation',
          message: 'Output blocked',
          component: 'guardrails',
          retriable: false,
        };
        const { completion } = runStream(
          [{ error, trace_id: 'guardrail-trace' }],
          trailing,
          throwingTrackEvent,
        );
        await expect(completion).rejects.toMatchObject({ error, trace_id: 'guardrail-trace' });
        expect(throwingTrackEvent.mock.calls).toEqual([
          ['Guardrail Activated', { violationDetected: true }],
        ]);
      },
    );

    it.each([false, true])(
      'should reject a refusal after content when tracking throws (trailing: %s)',
      async (trailing) => {
        const throwingTrackEvent = jest.fn(() => {
          throw new Error('Tracking unavailable');
        });
        const { completion, onStreamData } = runStream(
          [
            { type: 'response.output_text.delta', delta: 'Safe content' },
            { type: 'response.refusal.delta', delta: 'Blocked' },
          ],
          trailing,
          throwingTrackEvent,
        );
        await expect(completion).rejects.toMatchObject({
          error: { code: 'guardrail_output_violation', component: 'guardrails' },
        });
        expect(throwingTrackEvent.mock.calls).toEqual([
          ['Guardrail Activated', { violationDetected: true }],
        ]);
        expect(onStreamData.mock.calls).toEqual([['Safe content']]);
      },
    );

    it('should track only once when repeated refusal deltas end in a trailing buffer', async () => {
      const { completion, onStreamData } = runStream(
        [
          { type: 'response.refusal.delta', delta: 'Cannot' },
          { type: 'response.refusal.delta', delta: ' comply' },
        ],
        true,
      );
      await completion;
      expect(trackEvent.mock.calls).toEqual([['Guardrail Activated', { violationDetected: true }]]);
      expect(onStreamData.mock.calls).toEqual([
        ['Cannot', true],
        [' comply', false],
      ]);
    });

    it('should reject a trailing-buffer refusal after safe content without clearing it', async () => {
      const { completion, onStreamData } = runStream(
        [
          { type: 'response.output_text.delta', delta: 'Safe content' },
          { type: 'response.refusal.delta', delta: 'Blocked' },
        ],
        true,
      );
      await expect(completion).rejects.toMatchObject({
        error: { code: 'guardrail_output_violation', component: 'guardrails' },
      });
      expect(trackEvent.mock.calls).toEqual([['Guardrail Activated', { violationDetected: true }]]);
      expect(onStreamData.mock.calls).toEqual([['Safe content']]);
    });

    it.each([
      { trailing: false, code: 'guardrail_output_violation', violation: true },
      { trailing: true, code: 'guardrail_output_violation', violation: true },
      { trailing: false, code: 'model_timeout', violation: false },
      { trailing: true, code: 'model_timeout', violation: false },
    ])(
      'should track only output-violation errors ($code, trailing: $trailing)',
      async ({ trailing, code, violation }) => {
        const error = {
          code,
          message: 'Request failed',
          component: 'guardrails',
          retriable: false,
        };
        const { completion } = runStream([{ error }], trailing);
        await expect(completion).rejects.toMatchObject({ error });
        expect(trackEvent.mock.calls).toEqual(
          violation ? [['Guardrail Activated', { violationDetected: true }]] : [],
        );
      },
    );
  });
});
