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

const liftErrorCode = (code: number) => {
  if (code === 1004 || code === 1005 || code === 1006) {
    // ws module forbid those error codes usage, lift to "application level" (4xxx)
    return 3000 + code;
  }
  return code;
};

const closeWebSocket = (socket: WebSocket, code: number, reason: string | Buffer) => {
  if (socket.readyState === WebSocket.OPEN) {
    // This usage of toString is fine for string | Buffer conversion
    // eslint-disable-next-line no-restricted-properties
    socket.close(liftErrorCode(code), reason?.toString() || 'error');
  }
};

const waitConnection = (socket: WebSocket, write: () => void) => {
  if (socket.readyState === WebSocket.CONNECTING) {
    socket.once('open', write);
  } else {
    write();
  }
};

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

        const url = `${
          fastify.kube.config.getCurrentCluster().server
        }/${kubeUri}?${new URLSearchParams(req.query)}`;

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

        const close = (code: number, reason: string) => {
          closeWebSocket(source, code, reason);
          closeWebSocket(target, code, reason);
        };

        const onUnexpectedResponse = (_: ClientRequest, response: IncomingMessage) =>
          close(
            1011,
            `unexpected response: ${response.statusCode ? `(${response.statusCode}) ` : ''}${
              response.statusMessage
            }`,
          );

        // attach source socket listeners and forward requests to the target
        source.on('message', (data: unknown, binary: boolean) =>
          waitConnection(target, () => target.send(data, { binary })),
        );
        source.on('ping', (data) => waitConnection(target, () => target.ping(data)));
        source.on('pong', (data) => waitConnection(target, () => target.pong(data)));
        source.on('close', close);
        source.on('error', (error) => close(1011, error.message));
        target.on('unexpected-response', onUnexpectedResponse);

        // attach target socket listeners and forward requests to the source
        target.on('message', (data: unknown, binary: boolean) => source.send(data, { binary }));
        target.on('ping', (data) => source.ping(data));
        target.on('pong', (data) => source.pong(data));
        target.on('close', close);
        target.on('error', (error) => close(1011, error.message));
        target.on('unexpected-response', onUnexpectedResponse);
      }),
  );
};
