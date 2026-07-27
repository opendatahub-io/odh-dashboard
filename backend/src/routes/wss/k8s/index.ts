import WebSocket from 'ws';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { getDirectCallOptions } from '../../../utils/directCallUtils';
import { getAccessToken } from '../../../utils/directCallUtils';
import { ClientRequest, IncomingMessage } from 'http';
import https from 'https';

const base64 = (data: string): string =>
  // This usage of toString is fine for decoding
  // eslint-disable-next-line no-restricted-properties
  Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').split('=', 1)[0];

/**
 * Convert reserved WebSocket close codes to valid codes that can be sent in a close frame.
 *
 * Per RFC 6455, certain codes cannot be set by applications:
 * - 1004: Reserved
 * - 1005: No Status Received (MUST NOT be set in close frame)
 * - 1006: Abnormal Closure (MUST NOT be set in close frame, indicates no close frame received)
 *
 * The `ws` module enforces this and throws if you try to close with these codes.
 *
 * We convert these to 1011 (Internal Error) which is semantically appropriate:
 * "The server is terminating the connection because it encountered an unexpected condition"
 */
const liftErrorCode = (code: number) => {
  if (code === 1004 || code === 1005 || code === 1006) {
    // Use 1011 (Internal Error) as a valid substitute for reserved codes
    return 1011;
  }
  return code;
};

const closeWebSocket = (socket: WebSocket, code: number, reason: string | Buffer) => {
  if (socket.readyState === WebSocket.OPEN) {
    const reasonStr = typeof reason === 'string' ? reason : String(reason);
    socket.close(liftErrorCode(code), reasonStr || 'error');
  }
};

const waitConnection = (socket: WebSocket, write: () => void) => {
  if (socket.readyState === WebSocket.CONNECTING) {
    socket.once('open', write);
  } else {
    write();
  }
};

// Connection metrics for monitoring
type ConnectionMetrics = {
  created: number;
  messagesReceived: number;
  messagesSent: number;
  lastResourceVersion?: string;
};

// Connection tracking includes metrics plus socket references for proper cleanup
type TrackedConnection = {
  metrics: ConnectionMetrics;
  source: WebSocket;
  target: WebSocket;
  kubeUri: string;
  heartbeatInterval: NodeJS.Timeout | null;
};

// Global connection tracking for monitoring and cleanup
const activeConnections = new Map<string, TrackedConnection>();

// Constants for connection management (exported for testing)
export const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds to establish connection
export const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds between heartbeats (matches OpenShift Console)

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.get(
    '/*',
    { websocket: true },
    (
      connection,
      req: OauthFastifyRequest<{
        Querystring: Record<string, string>;
        Params: { '*': string; [key: string]: string };
        Body: { [key: string]: unknown };
      }>,
    ) =>
      getDirectCallOptions(fastify, req, '').then((requestOptions) => {
        const source = connection.socket;
        const kubeUri = req.params['*'];
        const connectionId = `${req.id}-${kubeUri}`;

        const url = `${
          fastify.kube.config.getCurrentCluster().server
        }/${kubeUri}?${new URLSearchParams(req.query)}`;

        // Initialize connection metrics
        const metrics: ConnectionMetrics = {
          created: Date.now(),
          messagesReceived: 0,
          messagesSent: 0,
        };

        fastify.log.info(
          {
            connectionId,
          },
          `WebSocket watch initiated: ${kubeUri}`,
        );

        const accessToken = getAccessToken(requestOptions);
        const subprotocols = [
          `base64url.bearer.authorization.k8s.io.${base64(accessToken)}`,
          'base64.binary.k8s.io',
        ];

        const serverAddress = fastify.server.address();
        const target = new WebSocket(url, subprotocols, {
          headers: {
            host: req.headers.host,
            origin:
              req.headers.origin ||
              `http://${typeof serverAddress === 'string' ? serverAddress : serverAddress.address}`,
          },
          ca: https.globalAgent.options.ca as WebSocket.CertMeta,
        });

        // Track connection with socket references for proper cleanup
        const tracked: TrackedConnection = {
          metrics,
          source,
          target,
          kubeUri,
          heartbeatInterval: null,
        };
        activeConnections.set(connectionId, tracked);

        // Close both connections and log diagnostics
        const close = (code: number, reason: string | Buffer) => {
          // Make idempotent - only run once per connection
          if (!activeConnections.has(connectionId)) {
            return;
          }

          const reasonStr = typeof reason === 'string' ? reason : String(reason);

          fastify.log.info(
            {
              connectionId,
              code,
              reason: reasonStr,
              duration: Date.now() - metrics.created,
              messagesReceived: metrics.messagesReceived,
              messagesSent: metrics.messagesSent,
              lastResourceVersion: metrics.lastResourceVersion,
            },
            `Closing websocket connection: ${kubeUri}`,
          );

          // Clear heartbeat interval if it exists
          if (tracked.heartbeatInterval) {
            clearInterval(tracked.heartbeatInterval);
            tracked.heartbeatInterval = null;
          }

          closeWebSocket(source, code, reason);
          closeWebSocket(target, code, reason);
          activeConnections.delete(connectionId);
        };

        // Connection timeout handler
        const connectionTimeout = setTimeout(() => {
          if (target.readyState === WebSocket.CONNECTING) {
            fastify.log.error(
              {
                connectionId,
                timeout: CONNECTION_TIMEOUT_MS,
              },
              `WebSocket connection timeout for ${kubeUri}`,
            );
            target.terminate();
            close(1011, 'Connection timeout');
          }
        }, CONNECTION_TIMEOUT_MS);

        const onUnexpectedResponse = (_: ClientRequest, response: IncomingMessage) => {
          const statusCode = response.statusCode || 'unknown';
          const statusMessage = response.statusMessage || 'unknown';

          fastify.log.error(
            {
              connectionId,
              statusCode,
              statusMessage,
            },
            `Unexpected response from K8s API: ${kubeUri}`,
          );

          close(1011, `unexpected response: ${statusCode} ${statusMessage}`);
        };

        // Target (K8s API) connection established
        target.on('open', () => {
          clearTimeout(connectionTimeout);
          fastify.log.debug(
            {
              connectionId,
            },
            `WebSocket connection established to K8s API: ${kubeUri}`,
          );

          // Ping both sides to keep the connection alive through proxies/load balancers
          // (OpenShift Console pings the client every 30s for the same reason).
          tracked.heartbeatInterval = setInterval(() => {
            if (target.readyState === WebSocket.OPEN) {
              try {
                target.ping();
              } catch (error) {
                fastify.log.error(
                  { connectionId, error: error.message },
                  `Failed to send ping to K8s API: ${error.message}`,
                );
              }
            }
            if (source.readyState === WebSocket.OPEN) {
              try {
                source.ping();
              } catch (error) {
                fastify.log.error(
                  { connectionId, error: error.message },
                  `Failed to send ping to client: ${error.message}`,
                );
              }
            }
          }, HEARTBEAT_INTERVAL_MS);
        });

        // Handle messages from K8s API to client
        target.on('message', (data, binary) => {
          metrics.messagesReceived++;

          // Try to extract resourceVersion from watch events for diagnostics
          if (!binary && Buffer.isBuffer(data)) {
            try {
              // This usage of toString is fine for string | Buffer conversion
              // eslint-disable-next-line no-restricted-properties
              const event = JSON.parse(data.toString('utf8'));
              if (event.type === 'BOOKMARK' && event.object?.metadata?.resourceVersion) {
                metrics.lastResourceVersion = event.object.metadata.resourceVersion;
                fastify.log.debug(
                  {
                    connectionId,
                    resourceVersion: metrics.lastResourceVersion,
                  },
                  `Bookmark received for ${kubeUri}`,
                );
              } else if (event.object?.metadata?.resourceVersion) {
                metrics.lastResourceVersion = event.object.metadata.resourceVersion;
              }
            } catch (e) {
              // Not JSON or parsing failed, ignore
            }
          }

          // Forward directly - fail fast if client can't receive
          if (source.readyState === WebSocket.OPEN) {
            try {
              source.send(data, { binary });
              metrics.messagesSent++;
            } catch (error) {
              fastify.log.error(
                {
                  connectionId,
                  error: error.message,
                  messagesReceived: metrics.messagesReceived,
                  messagesSent: metrics.messagesSent,
                },
                `Failed to forward message to client, closing connection: ${error.message}`,
              );
              close(1011, `Send failed: ${error.message}`);
            }
          } else {
            fastify.log.warn(
              {
                connectionId,
                readyState: source.readyState,
                messagesReceived: metrics.messagesReceived,
              },
              `Client socket not ready, closing connection`,
            );
            close(1011, 'Client not ready');
          }
        });

        // Handle K8s API errors
        target.on('error', (error) => {
          fastify.log.error(
            {
              connectionId,
              error: error.message,
              stack: error.stack,
              messagesReceived: metrics.messagesReceived,
              duration: Date.now() - metrics.created,
            },
            `K8s API websocket error for ${kubeUri}: ${error.message}`,
          );

          close(1011, error.message);
        });

        // Handle K8s API connection close
        target.on('close', (code, reason) => {
          if (tracked.heartbeatInterval) {
            clearInterval(tracked.heartbeatInterval);
            tracked.heartbeatInterval = null;
          }

          const reasonStr = String(reason);
          fastify.log.info(
            {
              connectionId,
              code,
              reason: reasonStr,
              messagesReceived: metrics.messagesReceived,
              messagesSent: metrics.messagesSent,
              duration: Date.now() - metrics.created,
            },
            `K8s API websocket closed for ${kubeUri}`,
          );

          close(code, reasonStr);
        });

        target.on('unexpected-response', onUnexpectedResponse);

        // Handle messages from client to K8s API
        source.on('message', (data, binary: boolean) =>
          waitConnection(target, () => {
            try {
              target.send(data as Buffer, { binary });
            } catch (error) {
              fastify.log.error(
                {
                  connectionId,
                  error: error.message,
                },
                `Failed to forward message to K8s API: ${error.message}`,
              );
            }
          }),
        );

        source.on('ping', (data) =>
          waitConnection(target, () => {
            try {
              target.ping(data);
            } catch (error) {
              fastify.log.debug(
                { connectionId, error: error.message },
                `Failed to forward ping: ${error.message}`,
              );
            }
          }),
        );

        source.on('pong', (data) =>
          waitConnection(target, () => {
            try {
              target.pong(data);
            } catch (error) {
              fastify.log.debug(
                { connectionId, error: error.message },
                `Failed to forward pong: ${error.message}`,
              );
            }
          }),
        );

        // Handle client connection close
        source.on('close', (code, reason) => {
          if (tracked.heartbeatInterval) {
            clearInterval(tracked.heartbeatInterval);
            tracked.heartbeatInterval = null;
          }
          clearTimeout(connectionTimeout);

          const reasonStr = String(reason);
          fastify.log.debug(
            {
              connectionId,
              code,
              reason: reasonStr,
            },
            `Client websocket closed for ${kubeUri}`,
          );

          close(code, reasonStr);
        });

        // Handle client errors
        source.on('error', (error) => {
          fastify.log.error(
            {
              connectionId,
              error: error.message,
            },
            `Client websocket error for ${kubeUri}: ${error.message}`,
          );
          close(1011, error.message);
        });

        // Handle target ping/pong
        target.on('ping', (data) => {
          if (source.readyState === WebSocket.OPEN) {
            try {
              source.ping(data);
            } catch (error) {
              fastify.log.debug(
                { connectionId, error: error.message },
                `Failed to forward ping to client: ${error.message}`,
              );
            }
          }
        });

        target.on('pong', (data) => {
          if (source.readyState === WebSocket.OPEN) {
            try {
              source.pong(data);
            } catch (error) {
              fastify.log.debug(
                { connectionId, error: error.message },
                `Failed to forward pong to client: ${error.message}`,
              );
            }
          }
        });
      }),
  );
};
