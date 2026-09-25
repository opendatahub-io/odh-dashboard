import { getCaptionHeightBounds } from '~/app/topology/tree-view/treeCaptionHeight';

describe('getCaptionHeightBounds', () => {
  it('should return toggle bounds when expand toggle is shown', () => {
    expect(getCaptionHeightBounds(true, false)).toEqual({ min: 40, max: 64 });
    expect(getCaptionHeightBounds(true, true)).toEqual({ min: 40, max: 64 });
  });

  it('should return subtitle bounds when winner subtitle is shown without toggle', () => {
    expect(getCaptionHeightBounds(false, true)).toEqual({ min: 52, max: 80 });
  });

  it('should return label-only bounds for a plain caption', () => {
    expect(getCaptionHeightBounds(false, false)).toEqual({ min: 36, max: 48 });
  });

  it('should return wrapped bounds for column headers', () => {
    expect(getCaptionHeightBounds(false, false, true)).toEqual({ min: 44, max: 72 });
  });
});
