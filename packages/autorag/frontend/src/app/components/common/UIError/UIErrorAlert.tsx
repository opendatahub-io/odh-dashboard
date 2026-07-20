// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionLink, AlertGroup } from '@patternfly/react-core';
import type { UIError } from '~/app/components/common/UIError/types.ts';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorAlertProps {
  id?: string;
  uiError: UIError;
  handleShowDetails: (error: UIError) => void;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({ id, uiError, handleShowDetails }) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  return (
    <Alert
      id={rootId}
      variant="danger"
      title="Something went wrong"
      actionLinks={
        <>
          <AlertActionLink onClick={() => handleShowDetails(uiError)}>
            More details...
          </AlertActionLink>
        </>
      }
    >
      {uiError.reason}
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
export default UIErrorAlert;
