import { aiModelColumns } from '~/app/AIAssets/data/columns';

describe('aiModelColumns', () => {
  it('should label the endpoint column as Access details', () => {
    expect(aiModelColumns).toContainEqual(
      expect.objectContaining({ field: 'endpoints', label: 'Access details' }),
    );
  });
});
