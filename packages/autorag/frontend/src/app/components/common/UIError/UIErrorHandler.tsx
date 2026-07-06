// Modules -------------------------------------------------------------------->

import React from 'react';
import UIErrorModal from './UIErrorModal.tsx';
import UIErrorToast from './UIErrorToast.tsx';

// Types ---------------------------------------------------------------------->
// Globals -------------------------------------------------------------------->
// Private -------------------------------------------------------------------->
// Components ----------------------------------------------------------------->

interface UIErrorHandlerProps {
  id: string;
}
const UIErrorHandler: React.FC<UIErrorHandlerProps> = ({ id }) => {
  const mockUIError = {
    messageId: 'fake_message_id',
    reason: 'A fake error happened because...',
    status: 500,
    transactionId: '000-0000-0000-000',
    details: {
      sampleDetailA: 'sample_detail_a',
      sampleDetailB: 'sample_detail_b',
      sampleDetailC: 'sample_detail_c',
    },
  };
  return (
    <div id={id}>
      <UIErrorModal id={`${id}-UIErrorModal`} isOpen={false} />
      <UIErrorToast id={`${id}-UIErrorToast`} uiError={mockUIError} />
    </div>
  );
};

// Public --------------------------------------------------------------------->

export default UIErrorHandler;
