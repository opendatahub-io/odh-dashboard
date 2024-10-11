import { ClipboardCopy, Truncate } from '@patternfly/react-core';
import * as React from 'react';

type Props = {
  textToCopy: string;
  testId?: string;
  maxWidth?: number;
};

/** Hopefully PF will add some flexibility with ClipboardCopy
 *  in the future and this will not be necessary
 * https://github.com/patternfly/patternfly-react/issues/10890
 **/

const InlineTruncatedClipboardCopy: React.FC<Props> = ({ textToCopy, testId, maxWidth }) => (
  <ClipboardCopy
    variant="inline-compact"
    style={{ display: 'inline-flex', maxWidth }}
    hoverTip="Copy"
    clickTip="Copied"
    onCopy={() => {
      navigator.clipboard.writeText(textToCopy);
    }}
    data-testid={testId}
  >
    <Truncate content={textToCopy} />
  </ClipboardCopy>
);

export default InlineTruncatedClipboardCopy;
