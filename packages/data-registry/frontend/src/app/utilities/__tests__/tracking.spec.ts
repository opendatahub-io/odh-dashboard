import {
  DATA_REGISTRY_EVENT_NAMES,
  getRegistrationErrorCategory,
  toDataRegistryTrackEvent,
} from '~/app/utilities/tracking';

describe('getRegistrationErrorCategory', () => {
  it('should normalize an HTTP status from an Error message', () => {
    expect(getRegistrationErrorCategory(new Error('status code 409: Conflict'))).toBe('http_409');
  });

  it('should normalize an HTTP status from an error object', () => {
    expect(getRegistrationErrorCategory({ status: 503 })).toBe('http_503');
    expect(getRegistrationErrorCategory({ code: 409 })).toBe('http_409');
    expect(getRegistrationErrorCategory({ response: { status: 401 } })).toBe('http_401');
    expect(getRegistrationErrorCategory(new Error('API error 409: Conflict'))).toBe('http_409');
  });

  it('should return unknown_error without exposing the error message', () => {
    expect(getRegistrationErrorCategory(new Error('customer project details'))).toBe(
      'unknown_error',
    );
    expect(getRegistrationErrorCategory(new Error('invalid code: value 123 rejected'))).toBe(
      'unknown_error',
    );
    expect(getRegistrationErrorCategory(new Error('status code 999: invalid'))).toBe(
      'unknown_error',
    );
    expect(getRegistrationErrorCategory(new Error('status code 099: invalid'))).toBe(
      'unknown_error',
    );
  });
});

describe('toDataRegistryTrackEvent', () => {
  it('should delegate the exact event name and properties', () => {
    const trackEvent = jest.fn();

    toDataRegistryTrackEvent(trackEvent, {
      eventName: DATA_REGISTRY_EVENT_NAMES.searchPerformed,
      properties: {
        hasQuery: true,
        queryLength: 4,
        resultCount: 2,
        project: 'demo-project',
      },
    });

    expect(trackEvent).toHaveBeenCalledWith('Data Registry Search Performed', {
      hasQuery: true,
      queryLength: 4,
      resultCount: 2,
      project: 'demo-project',
    });
  });

  it('should swallow tracking failures', () => {
    const trackEvent = jest.fn(() => {
      throw new Error('tracking unavailable');
    });

    expect(() =>
      toDataRegistryTrackEvent(trackEvent, {
        eventName: DATA_REGISTRY_EVENT_NAMES.assetOpened,
        properties: { project: 'demo-project' },
      }),
    ).not.toThrow();
  });
});
