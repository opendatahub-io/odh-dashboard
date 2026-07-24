// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionCloseButton, AlertActionLink, AlertGroup } from '@patternfly/react-core';
import type { UIErrorMapping } from './types.ts';
import { UIErrorDefaults } from './constants.ts';
import type { UIErrorInstance } from './UIErrorInstance.ts';
import { useUIErrorHandler } from './UIErrorHandler.tsx';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
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

  return (
    <Alert
      id={rootId}
      variant="danger"
      title={uiErrorMapping?.title || UIErrorDefaults.uiErrorMapping.title}
      actionClose={<AlertActionCloseButton onClose={() => closeUIError(uiError)} />}
      actionLinks={
        <>
          <AlertActionLink onClick={() => showDetails(uiError)}>More details...</AlertActionLink>
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
