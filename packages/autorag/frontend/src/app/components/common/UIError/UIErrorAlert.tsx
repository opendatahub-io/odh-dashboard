/* eslint-disable @typescript-eslint/no-unused-vars -- Temporary */

// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import { Alert, AlertActionLink, AnimationsProvider } from '@patternfly/react-core';
import type { UIError } from '~/app/components/common/UIError/types.ts';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorAlertProps {
  id?: string;
  uiError: UIError;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({ id, uiError }) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  return (
    <Alert
      id={rootId}
      isInline
      variant="danger"
      title="Something went wrong"
      actionLinks={
        <>
          <AlertActionLink // eslint-disable-next-line no-console
            onClick={() => console.log('Clicked on details')}
          >
            More details...
          </AlertActionLink>
        </>
      }
    >
      {uiError.reason}
    </Alert>
  );
};

// Public --------------------------------------------------------------------->

export default UIErrorAlert;
