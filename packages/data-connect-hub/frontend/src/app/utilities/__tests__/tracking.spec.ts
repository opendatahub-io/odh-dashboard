import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  DATA_CONNECT_HUB_EVENT_NAMES,
  fireDataConnectHubTrackEvent,
  getCreateConnectionAbandonStep,
  getConnectionCreationErrorCategory,
} from '~/app/utilities/tracking';

describe('getCreateConnectionAbandonStep', () => {
  it('should map wizard steps to the supported abandon steps', () => {
    expect(getCreateConnectionAbandonStep(1)).toBe('type_selection');
    expect(getCreateConnectionAbandonStep(2)).toBe('connection_details');
    expect(getCreateConnectionAbandonStep(3)).toBe('configuration');
    expect(getCreateConnectionAbandonStep(4)).toBe('review');
  });
});

describe('getConnectionCreationErrorCategory', () => {
  it('should normalize an HTTP status from an Error message', () => {
    expect(getConnectionCreationErrorCategory(new Error('status code 409: Conflict'))).toBe(
      'http_409',
    );
  });

  it('should normalize an HTTP status from an error object', () => {
    expect(getConnectionCreationErrorCategory({ response: { status: 503 } })).toBe('http_503');
  });

  it('should prefer a structured HTTP status over an Error message', () => {
    const error = Object.assign(new Error('status code 500: server failed'), { status: 403 });

    expect(getConnectionCreationErrorCategory(error)).toBe('http_403');
  });

  it('should return unknown_error without exposing the error message', () => {
    expect(getConnectionCreationErrorCategory(new Error('customer secret'))).toBe('unknown_error');
    expect(
      getConnectionCreationErrorCategory(new Error('status unchanged since 304 days ago')),
    ).toBe('unknown_error');
    expect(getConnectionCreationErrorCategory(new Error('Error code 201 items found'))).toBe(
      'unknown_error',
    );
    expect(getConnectionCreationErrorCategory({ code: 104 })).toBe('unknown_error');
  });
});

describe('fireDataConnectHubTrackEvent', () => {
  it('should forward creation events with unchanged outcome and success', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated,
      properties: {
        outcome: TrackingOutcome.submit,
        success: true,
        connectionTypeProvider: 'postgresql',
        hasTags: true,
        tagCount: 1,
        project: 'test-project',
      },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections Connection Created', {
      outcome: 'submit',
      success: true,
      connectionTypeProvider: 'postgresql',
      hasTags: true,
      tagCount: 1,
      project: 'test-project',
    });
  });

  it('should forward add-started events', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.addStarted,
      properties: { project: 'test-project', source: 'connections_tab' },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections Add Started', {
      project: 'test-project',
      source: 'connections_tab',
    });
  });

  it('should forward type-selected events', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.typeSelected,
      properties: {
        connectionTypeProvider: 'postgresql',
        isGlobalType: true,
        project: 'test-project',
      },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections Type Selected', {
      connectionTypeProvider: 'postgresql',
      isGlobalType: true,
      project: 'test-project',
    });
  });

  it('should forward cancellation events without adding success or credentials', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.createCanceled,
      properties: {
        cancelMethod: 'esc',
        abandonStep: 'review',
        project: 'test-project',
        connectionTypeProvider: undefined,
      },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections Create Canceled', {
      cancelMethod: 'esc',
      abandonStep: 'review',
      project: 'test-project',
      connectionTypeProvider: undefined,
    });
  });

  it('should forward deletion events', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.deleteInitiated,
      properties: { project: 'test-project', connectionTypeProvider: 'postgresql' },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections Connection Delete Initiated', {
      project: 'test-project',
      connectionTypeProvider: 'postgresql',
    });
  });

  it('should forward filter events', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied,
      properties: { filterType: 'type', project: 'test-project' },
    });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('Connections List Filter Applied', {
      filterType: 'type',
      project: 'test-project',
    });
  });

  it('should leave diagnostics to the host instead of emitting the legacy misc warning', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const trackEvent = jest.fn();
    try {
      fireDataConnectHubTrackEvent(trackEvent, {
        eventName: DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied,
        properties: { filterType: 'name', project: 'test-project' },
      });
      expect(warning).not.toHaveBeenCalled();
      expect(trackEvent.mock.calls).toEqual([
        ['Connections List Filter Applied', { filterType: 'name', project: 'test-project' }],
      ]);
    } finally {
      warning.mockRestore();
    }
  });

  it('should preserve cancellation outcomes without adding a success field', () => {
    const trackEvent = jest.fn();
    fireDataConnectHubTrackEvent(trackEvent, {
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated,
      properties: {
        outcome: TrackingOutcome.cancel,
        hasTags: false,
        tagCount: 0,
        project: 'test-project',
      },
    });
    expect(trackEvent.mock.calls).toEqual([
      [
        'Connections Connection Created',
        {
          outcome: 'cancel',
          hasTags: false,
          tagCount: 0,
          project: 'test-project',
        },
      ],
    ]);
  });

  it('should not propagate callback failures for creation or misc events', () => {
    const trackEvent = jest.fn(() => {
      throw new Error('tracking failed');
    });
    expect(() =>
      fireDataConnectHubTrackEvent(trackEvent, {
        eventName: DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated,
        properties: {
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'http_409',
          hasTags: false,
          tagCount: 0,
          project: 'test-project',
        },
      }),
    ).not.toThrow();
    expect(() =>
      fireDataConnectHubTrackEvent(trackEvent, {
        eventName: DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied,
        properties: { filterType: 'name', project: 'test-project' },
      }),
    ).not.toThrow();
    expect(trackEvent.mock.calls).toEqual([
      [
        'Connections Connection Created',
        {
          outcome: 'submit',
          success: false,
          error: 'http_409',
          hasTags: false,
          tagCount: 0,
          project: 'test-project',
        },
      ],
      ['Connections List Filter Applied', { filterType: 'name', project: 'test-project' }],
    ]);
  });
});
