import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { toK8sFetchError } from '#~/utilities/k8sFetchError';

describe('toK8sFetchError', () => {
  it('should keep a Kubernetes Status body as-is', () => {
    const status = {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      code: 403,
      reason: 'Forbidden',
      message: 'notebooks "wb" is forbidden',
    };
    const error = toK8sFetchError(403, 'Forbidden', JSON.stringify(status));

    expect(error).toBeInstanceOf(K8sStatusError);
    expect((error as K8sStatusError).statusObject).toEqual(status);
    expect(error.message).toBe('notebooks "wb" is forbidden');
  });

  it('should wrap a backend JSON error body in a Status that carries the original code', () => {
    const body = JSON.stringify({
      statusCode: 415,
      code: 'FST_ERR_CTP_INVALID_MEDIA_TYPE',
      error: 'Unsupported Media Type',
      message: 'Unsupported Media Type: application/merge-patch+json',
    });
    const error = toK8sFetchError(415, 'Unsupported Media Type', body);

    expect(error).toBeInstanceOf(K8sStatusError);
    expect((error as K8sStatusError).statusObject).toEqual({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      code: 415,
      reason: 'DashboardProxyError',
      message: 'Unsupported Media Type: application/merge-patch+json',
      details: {
        causes: [
          {
            reason: 'FST_ERR_CTP_INVALID_MEDIA_TYPE',
            message: 'Unsupported Media Type: application/merge-patch+json',
          },
        ],
      },
    });
  });

  it('should return a plain Error for a non-JSON body so it is not read as a Kubernetes status', () => {
    const error = toK8sFetchError(502, 'Bad Gateway', '<html>502</html>');

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(K8sStatusError);
    expect(error.message).toBe('Bad Gateway');
  });

  it('should return a plain Error for an empty body and describe it by status code', () => {
    const error = toK8sFetchError(404, '', '');

    expect(error).not.toBeInstanceOf(K8sStatusError);
    expect(error.message).toBe('Request failed with status 404');
  });
});
