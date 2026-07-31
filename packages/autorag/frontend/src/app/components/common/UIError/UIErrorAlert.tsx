// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionCloseButton, AlertActionLink, AlertGroup } from '@patternfly/react-core';
import type { UIErrorMapping } from './types.ts';
import { UIErrorDefaults } from './constants.ts';
import type { UIErrorInstance } from './UIErrorInstance.ts';
import { useUIErrorHandler } from './UIErrorHandler.tsx';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->

const UIErrorAlertDismissTimeout = 8 * 1000;

// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorAlertProps {
  id?: string;
  uiError: UIErrorInstance;
  uiErrorMapping?: UIErrorMapping;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({ id, uiError, uiErrorMapping }) => {
  const { closeUIError, showDetails } = useUIErrorHandler();
  const generatedId = useId();
  const rootId = id ?? generatedId;

  const [detailsViewed, setDetailsViewed] = React.useState(false);
  const [timedOut, setTimedOut] = React.useState(false);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);

  React.useEffect(() => {
    if (!detailsViewed) {
      return undefined;
    }
    const handle = setTimeout(() => {
      setTimedOut(true);
    }, UIErrorAlertDismissTimeout);
    return () => {
      clearTimeout(handle);
    };
  }, [detailsViewed]);

  React.useEffect(() => {
    if (timedOut && !mouseOver && !focusWithin) {
      closeUIError(uiError);
    }
  }, [timedOut, mouseOver, focusWithin, closeUIError, uiError]);

  const handleShowDetails = React.useCallback(() => {
    setDetailsViewed(true);
    showDetails(uiError);
  }, [showDetails, uiError]);

  return (
    <Alert
      id={rootId}
      variant="danger"
      title={uiErrorMapping?.title || UIErrorDefaults.uiErrorMapping.title}
      actionClose={<AlertActionCloseButton onClose={() => closeUIError(uiError)} />}
      actionLinks={
        <>
          <AlertActionLink onClick={handleShowDetails}>
            {UIErrorDefaults.labels.moreDetails}
          </AlertActionLink>
        </>
      }
      onMouseEnter={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      {uiErrorMapping?.description || uiError.reason || UIErrorDefaults.uiErrorMapping.description}
    </Alert>
  );
};

interface UIErrorAlertsProps {
  id?: string;
  children?: React.ReactNode;
}
const UIErrorAlerts: React.FC<UIErrorAlertsProps> = ({ id, children }) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  return (
    <AlertGroup
      id={rootId}
      isToast
      hasAnimations
      aria-live="assertive"
      data-testid="UIErrorAlerts-alert-group"
    >
      {children}
    </AlertGroup>
  );
};

// Public --------------------------------------------------------------------->

export { UIErrorAlert, UIErrorAlerts };
