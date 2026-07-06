import { mockRegisteredModel } from '#~/__mocks__';
import {
  ModelRegistryAPIs,
  ModelState,
  ModelRegistryMetadataType,
} from '#~/concepts/modelRegistry/types';
import { bumpRegisteredModelTimestamp } from '#~/concepts/modelRegistry/utils/updateTimestamps';

describe('updateTimestamps', () => {
  const mockApi = jest.mocked<Pick<ModelRegistryAPIs, 'patchRegisteredModel'>>({
    patchRegisteredModel: jest.fn(),
  });
  const fakeRegisteredModelId = 'test-registered-model-id';

  beforeEach(() => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
  });

  describe('bumpRegisteredModelTimestamp', () => {
    it('should successfully update registered model timestamp with model customProperties', async () => {
      await bumpRegisteredModelTimestamp(
        mockApi,
        mockRegisteredModel({
          id: fakeRegisteredModelId,
          customProperties: {
            'Registered from': {
              // eslint-disable-next-line camelcase
              string_value: 'Model catalog',
              metadataType: ModelRegistryMetadataType.STRING,
            },
            'Source model': {
              // eslint-disable-next-line camelcase
              string_value: 'test',
              metadataType: ModelRegistryMetadataType.STRING,
            },
          },
        }),
      );

      expect(mockApi.patchRegisteredModel).toHaveBeenCalledWith(
        {},
        {
          state: ModelState.LIVE,
          customProperties: {
            'Registered from': {
              // eslint-disable-next-line camelcase
              string_value: 'Model catalog',
              metadataType: ModelRegistryMetadataType.STRING,
            },
            'Source model': {
              // eslint-disable-next-line camelcase
              string_value: 'test',
              metadataType: ModelRegistryMetadataType.STRING,
            },
            _lastModified: {
              metadataType: ModelRegistryMetadataType.STRING,
              // eslint-disable-next-line camelcase
              string_value: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        fakeRegisteredModelId,
      );
    });

    it('should successfully update registered model timestamp', async () => {
      await bumpRegisteredModelTimestamp(
        mockApi,
        mockRegisteredModel({
          id: fakeRegisteredModelId,
        }),
      );

      expect(mockApi.patchRegisteredModel).toHaveBeenCalledWith(
        {},
        {
          state: ModelState.LIVE,
          customProperties: {
            _lastModified: {
              metadataType: ModelRegistryMetadataType.STRING,
              // eslint-disable-next-line camelcase
              string_value: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        fakeRegisteredModelId,
      );
    });

    it('should throw error if registeredModelId is empty', async () => {
      await expect(
        bumpRegisteredModelTimestamp(
          mockApi,
          mockRegisteredModel({
            id: '',
          }),
        ),
      ).rejects.toThrow('Registered model ID is required');
    });

    it('should handle API errors appropriately', async () => {
      const errorMessage = 'API Error';
      // Use proper type for mock function
      const mockFn = mockApi.patchRegisteredModel;
      mockFn.mockRejectedValue(new Error(errorMessage));

      await expect(
        bumpRegisteredModelTimestamp(
          mockApi,
          mockRegisteredModel({
            id: fakeRegisteredModelId,
          }),
        ),
      ).rejects.toThrow(`Failed to update registered model timestamp: ${errorMessage}`);
    });
  });
});
