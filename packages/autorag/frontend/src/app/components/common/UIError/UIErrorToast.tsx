/* eslint-disable @typescript-eslint/no-unused-vars -- Temporary */

// Modules -------------------------------------------------------------------->

import React from 'react';
import { Alert, AnimationsProvider } from '@patternfly/react-core';
import type { UIError } from '~/app/components/common/UIError/types.ts';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorAlertProps {
  id: string;
  uiError: UIError;
}
const UIErrorAlert: React.FC<UIErrorAlertProps> = ({ id, uiError }) => (
  <div id={id}>
    UI Error Alert <br />
    uiError: {JSON.stringify(uiError, null, '    ')}
  </div>
);

// Public --------------------------------------------------------------------->

export default UIErrorAlert;
