import * as React from 'react';
import {
  type CspViolationReport,
  installCspViolationReporter,
  subscribeToCspViolations,
} from './cspViolations';

type UseCspViolationReporterOptions = {
  /** Set to false to disable capture entirely (for example in tests or tools). */
  enabled?: boolean;
  /** Enables the dev-only `odh-csp-violation` event. Has no effect on capture. */
  devMode?: boolean;
  /** Called once per unique violation per page session. */
  onViolation?: (report: CspViolationReport) => void;
};

/**
 * Enables Content-Security-Policy violation capture and returns the violations seen
 * this session. This is the single entry point for capture: mount it once near the
 * root of the app and leave it mounted.
 *
 * Capture starts when the effect runs, which is after the first render. Violations
 * raised while the document itself is still loading are covered by the Cypress guard
 * in `packages/cypress/cypress/support/cspViolations.ts`, not by this reporter.
 */
export const useCspViolationReporter = ({
  enabled = true,
  devMode = false,
  onViolation,
}: UseCspViolationReporterOptions = {}): CspViolationReport[] => {
  const [violations, setViolations] = React.useState<CspViolationReport[]>([]);
  const onViolationRef = React.useRef(onViolation);

  React.useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribeToCspViolations((report) => {
      setViolations((current) => [...current, report]);
      onViolationRef.current?.(report);
    });
    const uninstall = installCspViolationReporter({ devMode });

    return () => {
      unsubscribe();
      uninstall();
    };
  }, [enabled, devMode]);

  return violations;
};
