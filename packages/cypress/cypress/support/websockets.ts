import type WebSocket from 'ws';
import { WebSocketServer } from 'ws';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Send data to through websockets to all matching connections.
       */
      wsSend: (
        matcher: string | { pathname: string; searchParams?: URLSearchParams },
        data: string | object,
      ) => void;
    }
  }
}

export const addCommands = (): void => {
  Cypress.Commands.add('wsSend', (matcher, data) => {
    cy.task('wsSend', { matcher, data });
  });
};

export const setup = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions): void => {
  const openSockets = new Map<string, { ws: WebSocket; searchParams: URLSearchParams }[]>();
  on('after:spec', () => {
    openSockets.clear();
  });

  if (config.env.MOCK) {
    const wss = new WebSocketServer({ port: Number(config.env.WS_PORT) });
    wss.on('connection', function connection(ws, req) {
      if (req.url) {
        const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host ?? ''}`);

        if (!openSockets.has(pathname)) {
          openSockets.set(pathname, []);
        }

        openSockets.get(pathname)?.push({ ws, searchParams });

        const close = () => {
          const items = openSockets.get(pathname);
          if (items) {
            const idx = items.findIndex((i) => i.ws === ws);
            items.splice(idx, 1);
          }
        };
        ws.on('close', close);
        ws.on('error', close);
      }
    });
  }

  on('task', {
    wsSend: ({
      matcher,
      data,
    }: {
      matcher: string | { pathname: string; searchParams?: URLSearchParams };
      data: string | object;
    }) => {
      let pathname: string;
      let searchParams: URLSearchParams | undefined;

      if (typeof matcher === 'string') {
        const url = new URL(matcher, `http://localhost`);
        pathname = url.pathname;
        searchParams = url.searchParams;
      } else {
        pathname = matcher.pathname;
        searchParams = matcher.searchParams;
      }

      openSockets.get(pathname)?.forEach((i) => {
        let hasAll = true;
        searchParams?.forEach((v, k) => {
          hasAll = hasAll && i.searchParams.get(k) === v;
        });
        // doesn’t recognize the assignment just above
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (hasAll) {
          i.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        }
      });

      return null;
    },
  });
};
