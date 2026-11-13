import * as React from 'react';
import { useNotification } from '@odh-dashboard/ui-core';
import type { CspViolationReport } from './cspViolations';
import { useCspViolationReporter } from './useCspViolationReporter';

type CspViolationToasterProps = {
  /** Shows a toast for each unique violation. Capture runs either way. */
  devMode?: boolean;
};

/**
 * Enables CSP violation capture for the app and, in development, surfaces each unique
 * violation as a toast. Production relies on `console.warn` and the Segment event, so
 * this renders nothing outside development.
 *
 * It lives in the analytics package because it is part of CSP reporting; it uses the
 * shared `@odh-dashboard/ui-core` notification context rather than the app's own
 * notification plumbing.
 */
export const CspViolationToaster: React.FC<CspViolationToasterProps> = ({ devMode = false }) => {
  const notification = useNotification();

  const showToast = React.useCallback(
    (report: CspViolationReport) => {
      notification.warning(
        `CSP violation: ${report.effectiveDirective}`,
        `Blocked ${report.blockedHost} on ${report.pagePath}`,
      );
    },
    [notification],
  );

  useCspViolationReporter({ devMode, onViolation: devMode ? showToast : undefined });

  return null;
};
