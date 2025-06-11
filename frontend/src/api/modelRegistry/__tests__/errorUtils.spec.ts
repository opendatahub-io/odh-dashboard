import { NotReadyError } from '#~/utilities/useFetchState';
import { handleModelRegistryFailures } from '#~/api/modelRegistry/errorUtils';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { ModelRegistryError } from '#~/concepts/modelRegistry/types';

describe('handleModelRegistryFailures', () => {
  it('should successfully return registered models', async () => {
    const modelRegistryMock = mockRegisteredModel({});
    const result = await handleModelRegistryFailures(Promise.resolve(modelRegistryMock));
    expect(result).toStrictEqual(modelRegistryMock);
  });

  it('should handle and throw model registry errors', async () => {
    const statusMock: ModelRegistryError = {
      code: '',
      message: 'error',
    };

    await expect(handleModelRegistryFailures(Promise.resolve(statusMock))).rejects.toThrow('error');
  });

  it('should handle common state errors ', async () => {
    await expect(
      handleModelRegistryFailures(Promise.reject(new NotReadyError('error'))),
    ).rejects.toThrow('error');
  });

  it('should handle other errors', async () => {
    await expect(handleModelRegistryFailures(Promise.reject(new Error('error')))).rejects.toThrow(
      'Error communicating with model registry server',
    );
  });
});
