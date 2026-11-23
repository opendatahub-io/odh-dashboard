import {
  deleteCollection,
  deleteGenericTable,
  deleteVolume,
} from '~/app/api/dataRegistry';
import { deleteCollectionWithAssets } from '~/app/utilities/deleteCollectionWithAssets';

jest.mock('~/app/api/dataRegistry', () => ({
  deleteCollection: jest.fn(),
  deleteGenericTable: jest.fn(),
  deleteVolume: jest.fn(),
}));

const mockDeleteCollection = jest.mocked(deleteCollection);
const mockDeleteGenericTable = jest.mocked(deleteGenericTable);
const mockDeleteVolume = jest.mocked(deleteVolume);

describe('deleteCollectionWithAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteCollection.mockResolvedValue(undefined);
    mockDeleteGenericTable.mockResolvedValue(undefined);
    mockDeleteVolume.mockResolvedValue(undefined);
  });

  it('deletes every asset before the collection', async () => {
    await deleteCollectionWithAssets('project', 'analytics', [
      { name: 'claims', assetType: 'table' },
      { name: 'docs', assetType: 'volume' },
    ]);

    expect(mockDeleteGenericTable).toHaveBeenCalledWith('project', 'analytics', 'claims');
    expect(mockDeleteVolume).toHaveBeenCalledWith('project', 'analytics', 'docs');
    expect(mockDeleteCollection).toHaveBeenCalledWith('project', 'analytics');
    expect(mockDeleteGenericTable.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteVolume.mock.invocationCallOrder[0],
    );
    expect(mockDeleteVolume.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteCollection.mock.invocationCallOrder[0],
    );
  });

  it('does not delete the collection when an asset delete fails', async () => {
    mockDeleteVolume.mockRejectedValue(new Error('volume denied'));

    await expect(
      deleteCollectionWithAssets('project', 'analytics', [
        { name: 'claims', assetType: 'table' },
        { name: 'docs', assetType: 'volume' },
      ]),
    ).rejects.toThrow(/Stopped at "docs".*collection was not deleted/);

    expect(mockDeleteGenericTable).toHaveBeenCalledTimes(1);
    expect(mockDeleteCollection).not.toHaveBeenCalled();
  });

  it('leaves the collection in place when its delete fails after the assets are gone', async () => {
    mockDeleteCollection.mockRejectedValue(new Error('still not empty'));

    await expect(
      deleteCollectionWithAssets('project', 'analytics', [
        { name: 'claims', assetType: 'table' },
      ]),
    ).rejects.toThrow(/collection could not be removed/);

    expect(mockDeleteGenericTable).toHaveBeenCalledTimes(1);
  });
});
