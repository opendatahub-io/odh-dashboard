import { isExternalDataReady } from '../ExternalDataLoader';

describe('isExternalDataReady', () => {
  it('should be ready when there is no external data', () => {
    expect(isExternalDataReady({})).toBe(true);
  });

  it('should be ready when every entry is loaded without error', () => {
    expect(
      isExternalDataReady({
        a: { loaded: true, data: 'a' },
        b: { loaded: true, data: undefined },
      }),
    ).toBe(true);
  });

  it('should not be ready while an entry is still loading', () => {
    expect(
      isExternalDataReady({
        a: { loaded: true, data: 'a' },
        b: { loaded: false, data: undefined },
      }),
    ).toBe(false);
  });

  it('should not be ready when an entry failed to load', () => {
    expect(
      isExternalDataReady({
        a: { loaded: true, loadError: new Error('boom'), data: undefined },
      }),
    ).toBe(false);
  });
});
