import { isNIMImageSelectionLocked } from '../NIMImageField';

describe('isNIMImageSelectionLocked', () => {
  it('should lock image selection when editing with a valid catalog image', () => {
    expect(
      isNIMImageSelectionLocked(
        true,
        { repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' },
        false,
      ),
    ).toBe(true);
  });

  it('should unlock image selection when repository is missing', () => {
    expect(isNIMImageSelectionLocked(true, { repository: '', tag: '1.0.0' }, false)).toBe(false);
  });

  it('should unlock image selection when tag is missing', () => {
    expect(
      isNIMImageSelectionLocked(
        true,
        { repository: 'nvcr.io/nim/test/test-model', tag: '' },
        false,
      ),
    ).toBe(false);
  });

  it('should unlock image selection when the image is not found in the catalog', () => {
    expect(
      isNIMImageSelectionLocked(
        true,
        { repository: 'nvcr.io/nim/test/legacy-model', tag: '9.9.9' },
        true,
      ),
    ).toBe(false);
  });

  it('should stay unlocked after selecting a catalog image when reselection was unlocked', () => {
    expect(
      isNIMImageSelectionLocked(
        true,
        { repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' },
        false,
        true,
      ),
    ).toBe(false);
  });

  it('should not lock image selection when not editing', () => {
    expect(
      isNIMImageSelectionLocked(
        false,
        { repository: 'nvcr.io/nim/test/test-model', tag: '1.0.0' },
        false,
      ),
    ).toBe(false);
  });
});
