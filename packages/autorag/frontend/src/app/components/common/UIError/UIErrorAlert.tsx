// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionLink, AlertGroup } from '@patternfly/react-core';
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
  handleShowDetails: (error: UIError) => void;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({
  id,
  uiError,
  uiErrorMapping,
  handleShowDetails,
}) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  return (
    <Alert
      id={rootId}
      variant="danger"
      title={uiErrorMapping?.title || UIErrorDefaults.uiErrorMapping.title}
      actionLinks={
        <>
          <AlertActionLink onClick={() => handleShowDetails(uiError)}>
            More details...
          </AlertActionLink>
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
