import { mock200Status, mock404Error } from '~/__mocks__/mockK8sStatus';
import { K8sStatusError, isK8sStatus, throwErrorFromAxios } from '~/api/errorUtils';
import { mockAxiosError } from '~/__mocks__/mockAxiosError';

describe('isK8sStatus', () => {
  it('should return true when data is k8sStatus', () => {
    const data = mock200Status({});
    const result = isK8sStatus(data);
    expect(result).toBe(true);
  });

  it('should return false when data is other than k8sStatus', () => {
    const error = {};
    const result = isK8sStatus(error);
    expect(result).toBe(false);
  });
});

describe('K8sStatusError', () => {
  it('should instantiate with correct status object', () => {
    const statusObject = mock404Error({});

    const error = new K8sStatusError(statusObject);
    expect(error.message).toStrictEqual(statusObject.message);
    expect(error).toMatchObject(new Error('404 Not Found'));
  });
});

describe('throwErrorFromAxios', () => {
  it('should throw axios error response', () => {
    const axiosResponse = mockAxiosError({});
    expect(() => throwErrorFromAxios(axiosResponse)).toThrowError('error');
  });

  it('should handle and throw other error', () => {
    const error = {
      name: 'error',
      message: 'Not Found',
    };
    expect(() => throwErrorFromAxios(error)).toThrowError('Not Found');
  });
});
