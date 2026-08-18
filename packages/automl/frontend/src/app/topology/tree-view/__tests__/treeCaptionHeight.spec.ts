import { getCaptionHeightBounds } from '~/app/topology/tree-view/treeCaptionHeight';

describe('getCaptionHeightBounds', () => {
  it('should return toggle bounds when expand toggle is shown', () => {
    expect(getCaptionHeightBounds(true, false)).toEqual({ min: 80, max: 120 });
    expect(getCaptionHeightBounds(true, true)).toEqual({ min: 80, max: 120 });
  });

  it('should return subtitle bounds when winner subtitle is shown without toggle', () => {
    expect(getCaptionHeightBounds(false, true)).toEqual({ min: 52, max: 80 });
  });

  it('should return label-only bounds for a plain caption', () => {
    expect(getCaptionHeightBounds(false, false)).toEqual({ min: 36, max: 48 });
  });
});
