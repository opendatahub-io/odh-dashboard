import { describe, expect, it, jest } from '@jest/globals';
import { buildProjectDeleteRequest, deleteOpenShiftProjectWithUid } from '../automlProjectDeletion';

describe('AutoX project deletion', () => {
  it('builds a Project API delete request with the recorded UID precondition', () => {
    expect(buildProjectDeleteRequest('cy-e2e-automl-123-1', 'namespace-uid-123')).toEqual({
      path: '/apis/project.openshift.io/v1/projects/cy-e2e-automl-123-1',
      body: {
        apiVersion: 'v1',
        kind: 'DeleteOptions',
        preconditions: { uid: 'namespace-uid-123' },
      },
    });
  });

  it('sends DeleteOptions through the requested cluster proxy and closes the proxy', async () => {
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const startProxy = jest
      .fn<(context?: string) => Promise<{ baseUrl: string; close: () => Promise<void> }>>()
      .mockResolvedValue({ baseUrl: 'http://127.0.0.1:12345', close });
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue({ ok: true, status: 202, text: async () => '' } as Response);

    const result = await deleteOpenShiftProjectWithUid(
      'cy-e2e-automl-123-1',
      'namespace-uid-123',
      'test-context',
      { startProxy, fetch },
    );

    expect(result).toEqual({ deleted: true });
    expect(startProxy).toHaveBeenCalledWith('test-context');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:12345/apis/project.openshift.io/v1/projects/cy-e2e-automl-123-1',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          apiVersion: 'v1',
          kind: 'DeleteOptions',
          preconditions: { uid: 'namespace-uid-123' },
        }),
      }),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('preserves a UID precondition conflict instead of deleting a replacement project', async () => {
    const startProxy = jest
      .fn<(context?: string) => Promise<{ baseUrl: string; close: () => Promise<void> }>>()
      .mockResolvedValue({
        baseUrl: 'http://127.0.0.1:12345',
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      });
    const fetch = jest.fn<typeof globalThis.fetch>().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => 'UID precondition failed',
    } as Response);

    await expect(
      deleteOpenShiftProjectWithUid('cy-e2e-automl-123-1', 'namespace-uid-123', undefined, {
        startProxy,
        fetch,
      }),
    ).resolves.toEqual({
      deleted: false,
      error: 'OpenShift rejected project deletion (409): UID precondition failed',
    });
  });

  it('rejects invalid project names and UIDs before starting a proxy', () => {
    expect(() => buildProjectDeleteRequest('invalid namespace', 'namespace-uid')).toThrow(
      'Invalid AutoX project name',
    );
    expect(() => buildProjectDeleteRequest('valid-project', 'invalid/uid')).toThrow(
      'Invalid AutoX project UID',
    );
  });
});
