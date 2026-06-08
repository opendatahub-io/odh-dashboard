import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeRangeControls, useTimeZoneParams } from '@perses-dev/plugin-system';
import PersesTimeControls from '../PersesTimeControls';

jest.mock('@perses-dev/plugin-system', () => ({
  TimeRangeControls: jest.fn(() => <div data-testid="time-range-controls" />),
  useTimeZoneParams: jest.fn(),
}));

const TimeRangeControlsMock = jest.mocked(TimeRangeControls);
const useTimeZoneParamsMock = jest.mocked(useTimeZoneParams);

describe('PersesTimeControls', () => {
  const mockSetTimeZone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useTimeZoneParamsMock.mockReturnValue({
      timeZone: 'local',
      setTimeZone: mockSetTimeZone,
    });
  });

  it('should render time range controls', () => {
    render(<PersesTimeControls />);
    expect(screen.getByTestId('time-range-controls')).toBeDefined();
  });

  it('should pass default props', () => {
    render(<PersesTimeControls />);
    expect(TimeRangeControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showTimeRangeSelector: true,
        showRefreshButton: true,
        showRefreshInterval: false,
        showCustomTimeRange: true,
        showZoomButtons: false,
        timeZone: 'local',
      }),
      expect.anything(),
    );
  });

  it('should pass custom props', () => {
    render(
      <PersesTimeControls showRefreshInterval showZoomButtons showTimeRangeSelector={false} />,
    );
    expect(TimeRangeControlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showTimeRangeSelector: false,
        showRefreshInterval: true,
        showZoomButtons: true,
      }),
      expect.anything(),
    );
  });
});
