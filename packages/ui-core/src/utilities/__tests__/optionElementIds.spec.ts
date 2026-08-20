import { createOptionElementId, encodeOptionIdForDom } from '../optionElementIds';

describe('optionElementIds', () => {
  it('should distinguish numeric and string option ids', () => {
    expect(encodeOptionIdForDom(1)).not.toBe(encodeOptionIdForDom('1'));
    expect(createOptionElementId('test', 1)).not.toBe(createOptionElementId('test', '1'));
  });

  it('should encode special characters injectively', () => {
    expect(encodeOptionIdForDom('a b')).not.toBe(encodeOptionIdForDom('a-b'));
    expect(encodeOptionIdForDom('a b')).toBe('s-au32ub');
    // The escape marker itself must be doubled, or literals collide with escapes.
    expect(encodeOptionIdForDom('u')).toBe('s-uu');
    expect(encodeOptionIdForDom('u32u')).not.toBe(encodeOptionIdForDom(' '));
  });

  it('should build stable option element ids', () => {
    expect(createOptionElementId('connection-type', 's3')).toBe('connection-type-option-s-s3');
    expect(createOptionElementId('connection-type', 42)).toBe('connection-type-option-n-42');
  });
});
