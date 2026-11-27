import { CSP_NONCE_PLACEHOLDER } from '@odh-dashboard/app-config/security-policy';
import root from '../root';
import { CSP_HEADER_REPORT_ONLY, CSP_MODE_ENV_VAR } from '../../utils/securityHeaders';

type Handler = (request: unknown, reply: unknown) => Promise<unknown>;

const buildReply = () => {
  const headers: Record<string, string> = {};
  let sent: string | undefined;

  const reply = {
    header: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return reply;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    type: (value: string) => {
      headers['content-type'] = value;
      return reply;
    },
    send: (payload: string) => {
      sent = payload;
      return reply;
    },
  };

  return { reply, headers, body: () => sent };
};

const registerRoute = async (): Promise<Handler> => {
  const handlers: Handler[] = [];
  const fastify = {
    log: { error: jest.fn() },
    get: (_path: string, handler: Handler) => handlers.push(handler),
    view: async (_page: string, data: { mfRemotesJson?: string }) =>
      `<html><head><script nonce="${CSP_NONCE_PLACEHOLDER}">x</script>` +
      `<script type="application/json">${data.mfRemotesJson ?? ''}</script></head></html>`,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await root(fastify as any);
  expect(handlers).toHaveLength(1);
  return handlers[0];
};

describe('SPA shell CSP nonce', () => {
  const originalCspMode = process.env[CSP_MODE_ENV_VAR];

  beforeEach(() => {
    // These tests read the Report-Only header. Pin the mode instead of relying on the
    // ambient environment or on the temporary unset-means-Report-Only default, which the
    // enforcement follow-up flips.
    process.env[CSP_MODE_ENV_VAR] = 'report-only';
  });

  afterEach(() => {
    if (originalCspMode === undefined) {
      delete process.env[CSP_MODE_ENV_VAR];
    } else {
      process.env[CSP_MODE_ENV_VAR] = originalCspMode;
    }
  });

  it('writes the header nonce into the document', async () => {
    const handler = await registerRoute();
    const { reply, headers, body } = buildReply();

    await handler({}, reply);

    const policy = headers[CSP_HEADER_REPORT_ONLY.toLowerCase()];
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];

    expect(nonce).toBeTruthy();
    expect(body()).toContain(`nonce="${nonce}"`);
    expect(body()).not.toContain(CSP_NONCE_PLACEHOLDER);
  });

  it('uses a different nonce per response', async () => {
    const handler = await registerRoute();

    const first = buildReply();
    await handler({}, first.reply);
    const second = buildReply();
    await handler({}, second.reply);

    const nonceOf = (headers: Record<string, string>) =>
      /'nonce-([^']+)'/.exec(headers[CSP_HEADER_REPORT_ONLY.toLowerCase()])?.[1];

    expect(nonceOf(first.headers)).toBeTruthy();
    expect(nonceOf(first.headers)).not.toBe(nonceOf(second.headers));
  });
});
