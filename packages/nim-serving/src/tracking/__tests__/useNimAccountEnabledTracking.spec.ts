import { testHook } from '@odh-dashboard/jest-config/hooks';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { NIMAccountStatus } from '../../api/accounts/hooks';
import {
  fireNimAccountEnabled,
  NimAccountEnabledMode,
  NimFailureCategory,
} from '../nimTrackingConstants';
import { useNimAccountEnabledTracking } from '../useNimAccountEnabledTracking';

jest.mock('../nimTrackingConstants', () => ({
  ...jest.requireActual('../nimTrackingConstants'),
  fireNimAccountEnabled: jest.fn(),
}));

const mockFireNimAccountEnabled = jest.mocked(fireNimAccountEnabled);

describe('useNimAccountEnabledTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track successful enable after validation completes', () => {
    const renderResult = testHook(useNimAccountEnabledTracking)(
      true,
      NIMAccountStatus.PENDING,
      NimAccountEnabledMode.ENABLE,
    );

    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);

    expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });

  it('should require pending validation before tracking replace success', () => {
    const renderResult = testHook(useNimAccountEnabledTracking)(
      true,
      NIMAccountStatus.READY,
      NimAccountEnabledMode.REPLACE,
    );

    expect(mockFireNimAccountEnabled).not.toHaveBeenCalled();

    renderResult.rerender(true, NIMAccountStatus.PENDING, NimAccountEnabledMode.REPLACE);
    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.REPLACE);

    expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: NimAccountEnabledMode.REPLACE,
    });
  });

  it('should reset tracking state when submitted returns to false', () => {
    const renderResult = testHook(useNimAccountEnabledTracking)(
      true,
      NIMAccountStatus.PENDING,
      NimAccountEnabledMode.ENABLE,
    );

    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);
    expect(mockFireNimAccountEnabled).toHaveBeenCalledTimes(1);

    renderResult.rerender(false, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);
    renderResult.rerender(true, NIMAccountStatus.PENDING, NimAccountEnabledMode.ENABLE);
    renderResult.rerender(true, NIMAccountStatus.READY, NimAccountEnabledMode.ENABLE);

    expect(mockFireNimAccountEnabled).toHaveBeenCalledTimes(2);
  });

  it('should track API failures with an allowlisted category', () => {
    const renderResult = testHook(useNimAccountEnabledTracking)(
      false,
      NIMAccountStatus.NOT_FOUND,
      NimAccountEnabledMode.ENABLE,
    );

    renderResult.result.current.trackSubmitApiFailure(NimAccountEnabledMode.ENABLE);

    expect(mockFireNimAccountEnabled).toHaveBeenCalledWith({
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.API_FAILED,
      mode: NimAccountEnabledMode.ENABLE,
    });
  });
});
