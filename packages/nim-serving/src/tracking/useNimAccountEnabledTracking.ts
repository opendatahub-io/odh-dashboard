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
  trackSubmitApiFailure: (mode: NimAccountEnabledMode) => void;
} => {
  const hasTrackedSubmitRef = React.useRef(false);
  const hasSeenValidationPendingRef = React.useRef(false);

  React.useEffect(() => {
    if (!submitted) {
      hasTrackedSubmitRef.current = false;
      hasSeenValidationPendingRef.current = false;
    }
  }, [submitted]);

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

  return { trackSubmitApiFailure };
};
