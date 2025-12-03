import WebSocket from 'ws';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import wssK8sRoutes, {
  CONNECTION_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  STALE_CONNECTION_MS,
} from '../routes/wss/k8s/index';
import { getDirectCallOptions, getAccessToken } from '../utils/directCallUtils';

// Mock dependencies
jest.mock('../utils/directCallUtils');
jest.mock('ws');
jest.mock('https', () => ({
  globalAgent: {
    options: {
      ca: undefined,
    },
  },
}));

describe('WebSocket K8s Proxy', () => {
  let mockFastify: KubeFastifyInstance;
  let mockConnection: any;
  let mockRequest: OauthFastifyRequest;
  let mockSourceSocket: any;
  let mockTargetSocket: any;
  let mockLog: any;
  let routeHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockLog = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockSourceSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn(),
    };

    mockTargetSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn(),
    };

    mockConnection = {
      socket: mockSourceSocket,
    };

    mockFastify = {
      log: mockLog,
      kube: {
        config: {
          getCurrentCluster: jest.fn().mockReturnValue({
            server: 'https://api.example.com',
          }),
        },
      },
      server: {
        address: jest.fn().mockReturnValue({
          address: 'localhost',
          port: 4000,
        }),
      },
      get: jest.fn(),
      addHook: jest.fn(),
    } as any;

    mockRequest = {
      id: 'test-request-id',
      params: {
        '*': 'api/v1/namespaces?watch=true',
      },
      query: {
        watch: 'true',
      },
      headers: {
        host: 'localhost',
        origin: 'http://localhost',
      },
    } as any;

    (getDirectCallOptions as jest.Mock).mockResolvedValue({});
    (getAccessToken as jest.Mock).mockReturnValue('test-token');
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockTargetSocket);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Route Registration', () => {
    it('should register WebSocket route with correct path', async () => {
      await wssK8sRoutes(mockFastify);

      expect(mockFastify.get).toHaveBeenCalledWith('/*', { websocket: true }, expect.any(Function));
    });

    it('should register cleanup hook for server shutdown', async () => {
      await wssK8sRoutes(mockFastify);

      expect(mockFastify.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
    });
  });

  describe('Connection Timeout', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should terminate connection if not established within CONNECTION_TIMEOUT_MS', async () => {
      mockTargetSocket.readyState = WebSocket.CONNECTING;

      await routeHandler(mockConnection, mockRequest);

      // Advance timers by timeout duration
      jest.advanceTimersByTime(CONNECTION_TIMEOUT_MS);

      expect(mockTargetSocket.terminate).toHaveBeenCalled();
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: CONNECTION_TIMEOUT_MS,
        }),
        expect.stringContaining('WebSocket connection timeout'),
      );
    });

    it('should not terminate if connection opens before timeout', async () => {
      mockTargetSocket.readyState = WebSocket.CONNECTING;

      await routeHandler(mockConnection, mockRequest);

      // Simulate connection opening
      const openHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'open',
      )?.[1];
      mockTargetSocket.readyState = WebSocket.OPEN;
      openHandler();

      // Advance past timeout
      jest.advanceTimersByTime(CONNECTION_TIMEOUT_MS + 1000);

      expect(mockTargetSocket.terminate).not.toHaveBeenCalled();
    });
  });

  describe('Heartbeat Monitoring', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should start heartbeat after connection opens', async () => {
      await routeHandler(mockConnection, mockRequest);

      const openHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'open',
      )?.[1];

      openHandler();

      // Advance by heartbeat interval
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      expect(mockTargetSocket.ping).toHaveBeenCalled();
    });

    it('should send pings at regular intervals', async () => {
      await routeHandler(mockConnection, mockRequest);

      const openHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'open',
      )?.[1];

      openHandler();

      // Advance through multiple heartbeat intervals
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(mockTargetSocket.ping).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(mockTargetSocket.ping).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      expect(mockTargetSocket.ping).toHaveBeenCalledTimes(3);
    });

    it('should not ping when socket is not OPEN', async () => {
      await routeHandler(mockConnection, mockRequest);

      const openHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'open',
      )?.[1];

      openHandler();

      // First heartbeat with socket OPEN
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      const pingsWhileOpen = mockTargetSocket.ping.mock.calls.length;

      // Change socket state to CLOSING
      mockTargetSocket.readyState = WebSocket.CLOSING;

      // Next heartbeat with socket CLOSING
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);

      // Should not have sent additional pings
      expect(mockTargetSocket.ping.mock.calls.length).toBe(pingsWhileOpen);
    });

    it('should stop heartbeat after connection closes', async () => {
      await routeHandler(mockConnection, mockRequest);

      const openHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'open',
      )?.[1];

      openHandler();

      // First heartbeat
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
      const firstPingCount = mockTargetSocket.ping.mock.calls.length;

      // Close connection
      const closeHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];
      closeHandler(1000, 'Normal close');

      // Advance more time
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);

      // No more pings
      expect(mockTargetSocket.ping.mock.calls.length).toBe(firstPingCount);
    });
  });

  describe('Idempotent Close', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should close connection only once when called multiple times', async () => {
      await routeHandler(mockConnection, mockRequest);

      const closeHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];

      // Call close multiple times
      closeHandler(1000, 'First close');
      closeHandler(1000, 'Second close');
      closeHandler(1000, 'Third close');

      // Should only log closing once
      const closingLogs = mockLog.info.mock.calls.filter((call: any) =>
        call[1]?.includes('Closing websocket connection'),
      );
      expect(closingLogs.length).toBe(1);

      // Should close sockets only once
      expect(mockSourceSocket.close).toHaveBeenCalledTimes(1);
      expect(mockTargetSocket.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close from both source and target without duplicates', async () => {
      await routeHandler(mockConnection, mockRequest);

      const sourceCloseHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];

      const targetCloseHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];

      // Trigger close from source
      sourceCloseHandler(1000, 'Client closed');

      // Try to trigger close from target
      mockLog.info.mockClear();
      targetCloseHandler(1000, 'Server closed');

      // Should not log closing again
      const closingLogs = mockLog.info.mock.calls.filter((call: any) =>
        call[1]?.includes('Closing websocket connection'),
      );
      expect(closingLogs.length).toBe(0);
    });
  });

  describe('Message Forwarding', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should forward messages directly when client is ready', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      const testData = Buffer.from('test message');
      messageHandler(testData, false);

      expect(mockSourceSocket.send).toHaveBeenCalledWith(testData, { binary: false });
    });

    it('should close connection when client socket is not ready', async () => {
      mockSourceSocket.readyState = WebSocket.CONNECTING;

      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      // Send message while socket is connecting
      messageHandler(Buffer.from('message 1'), false);

      // Should warn and trigger close logic
      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          readyState: WebSocket.CONNECTING,
        }),
        expect.stringContaining('Client socket not ready'),
      );

      // closeWebSocket only closes OPEN sockets, so target (which is OPEN) will be closed
      // but source (which is CONNECTING) will not
      expect(mockTargetSocket.close).toHaveBeenCalled();
    });

    it('should close connection when send fails', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      // Make send fail
      mockSourceSocket.send.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      messageHandler(Buffer.from('test message'), false);

      // Should close connection on send failure
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error',
        }),
        expect.stringContaining('Failed to forward message to client, closing connection'),
      );

      expect(mockSourceSocket.close).toHaveBeenCalled();
      expect(mockTargetSocket.close).toHaveBeenCalled();
    });

    it('should forward multiple messages successfully', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      // Send multiple messages
      messageHandler(Buffer.from('first'), false);
      messageHandler(Buffer.from('second'), false);
      messageHandler(Buffer.from('third'), false);

      // All should be forwarded
      expect(mockSourceSocket.send).toHaveBeenCalledTimes(3);
      expect(mockSourceSocket.send).toHaveBeenNthCalledWith(1, Buffer.from('first'), {
        binary: false,
      });
      expect(mockSourceSocket.send).toHaveBeenNthCalledWith(2, Buffer.from('second'), {
        binary: false,
      });
      expect(mockSourceSocket.send).toHaveBeenNthCalledWith(3, Buffer.from('third'), {
        binary: false,
      });
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should track messages received and sent', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      // Receive and forward messages
      messageHandler(Buffer.from('message 1'), false);
      messageHandler(Buffer.from('message 2'), false);
      messageHandler(Buffer.from('message 3'), false);

      jest.runOnlyPendingTimers();

      // Close to check metrics
      const closeHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];
      closeHandler(1000, 'Done');

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.objectContaining({
          messagesReceived: 3,
          messagesSent: 3,
        }),
        expect.stringContaining('Closing websocket connection'),
      );
    });

    it('should track resourceVersion from watch events', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      const watchEvent = Buffer.from(
        JSON.stringify({
          type: 'ADDED',
          object: {
            metadata: {
              resourceVersion: '12345',
            },
          },
        }),
      );

      messageHandler(watchEvent, false);

      const closeHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];
      closeHandler(1000, 'Done');

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.objectContaining({
          lastResourceVersion: '12345',
        }),
        expect.stringContaining('Closing websocket connection'),
      );
    });

    it('should log BOOKMARK events', async () => {
      await routeHandler(mockConnection, mockRequest);

      const messageHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )?.[1];

      const bookmarkEvent = Buffer.from(
        JSON.stringify({
          type: 'BOOKMARK',
          object: {
            metadata: {
              resourceVersion: '99999',
            },
          },
        }),
      );

      messageHandler(bookmarkEvent, false);

      expect(mockLog.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceVersion: '99999',
        }),
        expect.stringContaining('Bookmark received'),
      );
    });

    it('should track connection duration', async () => {
      const startTime = Date.now();
      jest.setSystemTime(startTime);

      await routeHandler(mockConnection, mockRequest);

      // Advance time by 5 seconds
      jest.setSystemTime(startTime + 5000);

      const closeHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'close',
      )?.[1];
      closeHandler(1000, 'Done');

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 5000,
        }),
        expect.stringContaining('Closing websocket connection'),
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];
    });

    it('should handle target socket errors', async () => {
      await routeHandler(mockConnection, mockRequest);

      const errorHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'error',
      )?.[1];

      const error = new Error('Connection failed');
      errorHandler(error);

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection failed',
        }),
        expect.stringContaining('K8s API websocket error'),
      );
    });

    it('should handle source socket errors', async () => {
      await routeHandler(mockConnection, mockRequest);

      const errorHandler = mockSourceSocket.on.mock.calls.find(
        (call: any) => call[0] === 'error',
      )?.[1];

      const error = new Error('Client error');
      errorHandler(error);

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Client error',
        }),
        expect.stringContaining('Client websocket error'),
      );
    });

    it('should handle unexpected responses from K8s API', async () => {
      await routeHandler(mockConnection, mockRequest);

      const unexpectedResponseHandler = mockTargetSocket.on.mock.calls.find(
        (call: any) => call[0] === 'unexpected-response',
      )?.[1];

      const mockResponse = {
        statusCode: 403,
        statusMessage: 'Forbidden',
      };

      unexpectedResponseHandler(undefined, mockResponse);

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          statusMessage: 'Forbidden',
        }),
        expect.stringContaining('Unexpected response from K8s API'),
      );
    });
  });

  describe('Stale Connection Cleanup', () => {
    it('should periodically clean up stale connections', async () => {
      await wssK8sRoutes(mockFastify);
      routeHandler = (mockFastify.get as jest.Mock).mock.calls[0][2];

      // Create a connection
      await routeHandler(mockConnection, mockRequest);

      // Advance time to trigger cleanup (runs every minute)
      jest.advanceTimersByTime(60000);

      // Connection is still active, so no cleanup warning yet
      expect(mockLog.warn).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Removing stale connection'),
      );

      // Advance time beyond stale threshold
      jest.advanceTimersByTime(STALE_CONNECTION_MS);
      jest.advanceTimersByTime(60000); // Trigger another cleanup cycle

      // Now stale connection should be cleaned up
      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          inactivityDuration: expect.any(Number),
        }),
        expect.stringContaining('Removing stale connection from tracking'),
      );
    });
  });

  describe('Configuration Constants', () => {
    it('should have connection timeout less than heartbeat interval', () => {
      expect(CONNECTION_TIMEOUT_MS).toBeLessThan(HEARTBEAT_INTERVAL_MS);
    });

    it('should have heartbeat interval less than stale connection threshold', () => {
      expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(STALE_CONNECTION_MS);
    });
  });
});
