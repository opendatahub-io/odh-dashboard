import { IncomingHttpHeaders } from 'http';
import { addDefaultCacheControl } from '../../utils/proxy';

describe('addDefaultCacheControl', () => {
  it('should set Cache-Control to no-cache when not present', () => {
    const result = addDefaultCacheControl({});
    expect(result['cache-control']).toBe('no-cache');
  });

  it.each(['public, max-age=31536000, immutable', 'no-store', 'public, max-age=0', 'no-cache'])(
    'should preserve existing Cache-Control: %s',
    (value) => {
      const headers: IncomingHttpHeaders = { 'cache-control': value };
      expect(addDefaultCacheControl(headers)['cache-control']).toBe(value);
    },
  );

  it('should mutate and return the same headers object', () => {
    const headers: IncomingHttpHeaders = {};
    expect(addDefaultCacheControl(headers)).toBe(headers);
  });
});
