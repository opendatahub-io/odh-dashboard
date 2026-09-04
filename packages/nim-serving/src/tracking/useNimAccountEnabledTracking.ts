import React from 'react';
import {
  fireNimAccountEnabled,
  NimAccountEnabledMode,
  NimFailureCategory,
  TrackingOutcome,
} from './nimTrackingConstants';
import { NIMAccountStatus } from '../api/accounts/hooks';

export const useNimAccountEnabledTracking = (
  submitted: boolean,
  accountStatus: NIMAccountStatus,
  submitMode: NimAccountEnabledMode,
): {
  resetTrackingState: () => void;
  trackSubmitApiFailure: (mode: NimAccountEnabledMode) => void;
} => {
  const hasTrackedSubmitRef = React.useRef(false);
  const hasSeenValidationPendingRef = React.useRef(false);

  const resetTrackingState = React.useCallback(() => {
    hasTrackedSubmitRef.current = false;
    hasSeenValidationPendingRef.current = false;
  }, []);

  const trackSubmitApiFailure = React.useCallback((mode: NimAccountEnabledMode) => {
    hasTrackedSubmitRef.current = true;
    fireNimAccountEnabled({
      outcome: TrackingOutcome.submit,
      success: false,
      error: NimFailureCategory.API_FAILED,
      mode,
    });
  }, []);

  React.useEffect(() => {
    if (!submitted || hasTrackedSubmitRef.current) {
      return;
    }

    if (accountStatus === NIMAccountStatus.PENDING) {
      hasSeenValidationPendingRef.current = true;
      return;
    }

    if (submitMode === NimAccountEnabledMode.REPLACE && !hasSeenValidationPendingRef.current) {
      return;
    }

    if (accountStatus === NIMAccountStatus.READY) {
      hasTrackedSubmitRef.current = true;
      fireNimAccountEnabled({
        outcome: TrackingOutcome.submit,
        success: true,
        mode: submitMode,
      });
      return;
    }

    if (accountStatus === NIMAccountStatus.ERROR) {
      hasTrackedSubmitRef.current = true;
      fireNimAccountEnabled({
        outcome: TrackingOutcome.submit,
        success: false,
        error: NimFailureCategory.VALIDATION_FAILED,
        mode: submitMode,
      });
    }
  }, [submitted, accountStatus, submitMode]);

  return { resetTrackingState, trackSubmitApiFailure };
};
