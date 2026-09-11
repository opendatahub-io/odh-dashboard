/**
 * @jest-environment node
 */
import { randomBytes } from 'crypto';

const requiredEnvironment = [
  'OPENSHELL_BFF_URL',
  'OPENSHELL_WORKSPACE',
  'OPENSHELL_SANDBOX_IMAGE',
  'ROSA_BEARER_TOKEN',
] as const;
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
const describeIntegration = missingEnvironment.length === 0 ? describe : describe.skip;

type ApiResponse = {
  body: unknown;
  status: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describeIntegration('Agent Ops upstream BFF black-box integration', () => {
  const baseUrl = (process.env.OPENSHELL_BFF_URL ?? '').replace(/\/$/, '');
  const workspace = process.env.OPENSHELL_WORKSPACE ?? '';
  const sandboxImage = process.env.OPENSHELL_SANDBOX_IMAGE ?? '';
  const bearerToken = process.env.ROSA_BEARER_TOKEN ?? '';
  const invalidToken = process.env.OPENSHELL_INVALID_BEARER_TOKEN ?? 'invalid-agent-ops-token';
  const sandboxName = `odh-poc-${randomBytes(4).toString('hex')}`;
  let sandboxCreated = false;

  jest.setTimeout(120_000);

  const request = async (path: string, init?: RequestInit): Promise<ApiResponse> => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
    const responseText = await response.text();

    if (responseText.includes(bearerToken) || responseText.includes(invalidToken)) {
      throw new Error('The BFF response included a bearer token');
    }

    let body: unknown;
    try {
      body = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      throw new Error('The BFF returned a non-JSON response');
    }

    return { body, status: response.status };
  };

  const authenticatedRequest = (path: string, init?: RequestInit): Promise<ApiResponse> =>
    request(path, {
      ...init,
      headers: {
        ...init?.headers,
        'x-forwarded-access-token': bearerToken,
      },
    });

  afterAll(async () => {
    if (sandboxCreated) {
      await authenticatedRequest(
        `/api/v1/workspaces/${encodeURIComponent(workspace)}/sandboxes/${encodeURIComponent(
          sandboxName,
        )}`,
        { method: 'DELETE' },
      );
    }
  });

  it('rejects a request without credentials', async () => {
    const result = await request('/api/v1/workspaces');

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ code: 'unauthorized', message: 'not authenticated' });
  });

  it('returns the documented gateway error for an unauthorized token', async () => {
    const result = await request('/api/v1/workspaces', {
      headers: { 'x-forwarded-access-token': invalidToken },
    });

    expect(result.status).toBe(401);
    expect(isRecord(result.body) && result.body.code).toBe('unauthenticated');
  });

  it('lists workspaces with an authenticated ODH token', async () => {
    const result = await authenticatedRequest('/api/v1/workspaces');

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('creates and deletes a sandbox', async () => {
    const sandboxPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/sandboxes`;
    const createResult = await authenticatedRequest(sandboxPath, {
      body: JSON.stringify({
        image: sandboxImage,
        name: sandboxName,
        policy: {
          filesystem: {
            includeWorkdir: true,
            readOnly: ['/usr'],
            readWrite: ['/sandbox'],
          },
          networkPolicies: {},
          version: 1,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    sandboxCreated = createResult.status === 201;
    expect(createResult.status).toBe(201);
    expect(
      isRecord(createResult.body) &&
        isRecord(createResult.body.metadata) &&
        createResult.body.metadata.name,
    ).toBe(sandboxName);

    const deleteResult = await authenticatedRequest(
      `${sandboxPath}/${encodeURIComponent(sandboxName)}`,
      { method: 'DELETE' },
    );

    expect(deleteResult.status).toBe(200);
    expect(deleteResult.body).toEqual({ deleted: true });
    sandboxCreated = false;
  });
});
