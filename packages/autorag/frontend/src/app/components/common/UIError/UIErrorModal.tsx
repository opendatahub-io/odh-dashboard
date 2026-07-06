// Modules -------------------------------------------------------------------->

import React from 'react';
import type { UIError } from './types.ts';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorModalProps {
  id: string;
  isOpen: boolean;
  uiError?: UIError;
}
const UIErrorModal: React.FC<UIErrorModalProps> = ({ id, isOpen, uiError }) => (
  <div id={id}>
    UI Error Modal. <br />
    isOpen: {isOpen} <br />
    uiError: {uiError && JSON.stringify(uiError, null, '    ')}
  </div>
);

// Public --------------------------------------------------------------------->

export default UIErrorModal;
