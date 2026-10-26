import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  DATA_CONNECT_HUB_EVENT_NAMES,
  fireDataConnectHubTrackEvent,
  getCreateConnectionAbandonStep,
  getConnectionCreationErrorCategory,
} from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

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
  it('should fire creation events as form tracking events', () => {
    fireDataConnectHubTrackEvent({
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

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Connections Connection Created', {
      outcome: TrackingOutcome.submit,
      success: true,
      connectionTypeProvider: 'postgresql',
      hasTags: true,
      tagCount: 1,
      project: 'test-project',
    });
  });

  it('should fire non-creation events as misc tracking events', () => {
    fireDataConnectHubTrackEvent({
      eventName: DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied,
      properties: { filterType: 'type', project: 'test-project' },
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Connections List Filter Applied', {
      filterType: 'type',
      project: 'test-project',
    });
  });

  it('should not propagate creation analytics failures', () => {
    mockFireFormTrackingEvent.mockImplementation(() => {
      throw new Error('tracking failed');
    });

    expect(() =>
      fireDataConnectHubTrackEvent({
        eventName: DATA_CONNECT_HUB_EVENT_NAMES.connectionCreated,
        properties: {
          outcome: TrackingOutcome.submit,
          success: true,
          connectionTypeProvider: 'postgresql',
          hasTags: false,
          tagCount: 0,
          project: 'test-project',
        },
      }),
    ).not.toThrow();
  });

  it('should not propagate misc analytics failures', () => {
    mockFireMiscTrackingEvent.mockImplementation(() => {
      throw new Error('tracking failed');
    });

    expect(() =>
      fireDataConnectHubTrackEvent({
        eventName: DATA_CONNECT_HUB_EVENT_NAMES.listFilterApplied,
        properties: { filterType: 'type', project: 'test-project' },
      }),
    ).not.toThrow();
  });
});
