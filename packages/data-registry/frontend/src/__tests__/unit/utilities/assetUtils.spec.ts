/* eslint-disable camelcase */
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { volumeToAsset } from '~/app/utilities/assetUtils';

describe('volumeToAsset', () => {
  it('should preserve content type while removing volume fields shown elsewhere', () => {
    const asset = volumeToAsset(
      mockVolumeInfo({
        'volume-type': 'EXTERNAL',
        comment: undefined,
        properties: {
          description: 'Training document storage',
          'content-type': 'application/pdf',
          'connection-ref': 'my-s3-connection',
          registered_by: 'user@example.com',
          updated_by: 'admin@example.com',
          purpose: 'training',
        },
      }),
      'underwriting',
    );

    expect(asset.asset_type).toBe('Unstructured');
    expect(asset.format).toBe('documents');
    expect(asset.description).toBe('Training document storage');
    expect(asset.properties).toEqual({
      'content-type': 'application/pdf',
      purpose: 'training',
    });
  });

  it('should fall back to volume type when content type is not a string', () => {
    const asset = volumeToAsset(
      mockVolumeInfo({
        'volume-type': 'images',
        properties: {
          'content-type': 123 as unknown as string,
        },
      }),
      'underwriting',
    );

    expect(asset.format).toBe('images');
    expect(asset.content_type).toBeUndefined();
  });
});
