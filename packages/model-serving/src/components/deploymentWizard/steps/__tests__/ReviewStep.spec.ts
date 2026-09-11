import { mergeReviewItems } from '../ReviewStep';

describe('mergeReviewItems', () => {
  const createItem = (key: string, replaces?: string) => ({
    key,
    ...(replaces ? { replaces } : {}),
    label: key,
    comp: () => key,
  });

  it('should replace a matching base item in place', () => {
    const result = mergeReviewItems(
      [createItem('modelType'), createItem('modelLocation'), createItem('image')],
      [createItem('nimModelType', 'modelType')],
    );

    expect(result.map((item) => item.key)).toEqual(['nimModelType', 'modelLocation', 'image']);
  });

  it('should append extension items without a replacement target', () => {
    const result = mergeReviewItems([createItem('modelType')], [createItem('nimImage')]);

    expect(result.map((item) => item.key)).toEqual(['modelType', 'nimImage']);
  });

  it('should append an extension item when its replacement target is not present', () => {
    const result = mergeReviewItems(
      [createItem('modelType')],
      [createItem('nimLocation', 'modelLocation')],
    );

    expect(result.map((item) => item.key)).toEqual(['modelType', 'nimLocation']);
  });
});
