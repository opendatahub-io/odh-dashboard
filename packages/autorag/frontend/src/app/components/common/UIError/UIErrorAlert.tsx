// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionCloseButton, AlertActionLink, AlertGroup } from '@patternfly/react-core';
import type { UIError, UIErrorMapping } from './types.ts';
import { UIErrorDefaults } from './constants.ts';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorAlertProps {
  id?: string;
  uiError: UIError;
  uiErrorMapping?: UIErrorMapping;
  handleDetails: (error: UIError) => void;
  handleClose: (error: UIError) => void;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({
  id,
  uiError,
  uiErrorMapping,
  handleDetails,
  handleClose,
}) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  return (
    <Alert
      id={rootId}
      variant="danger"
      title={uiErrorMapping?.title || UIErrorDefaults.uiErrorMapping.title}
      actionClose={<AlertActionCloseButton onClose={() => handleClose(uiError)} />}
      actionLinks={
        <>
          <AlertActionLink onClick={() => handleDetails(uiError)}>More details...</AlertActionLink>
        </>
      }
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
      isLiveRegion
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
