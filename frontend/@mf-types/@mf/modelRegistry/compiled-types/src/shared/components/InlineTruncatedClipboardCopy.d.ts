import * as React from 'react';
type Props = {
    textToCopy: string;
    truncatePosition?: 'middle' | 'end';
    testId?: string;
    maxWidth?: number;
};
/** Hopefully PF will add some flexibility with ClipboardCopy
 *  in the future and this will not be necessary
 * https://github.com/patternfly/patternfly-react/issues/10890
 **/
declare const InlineTruncatedClipboardCopy: React.FC<Props>;
export default InlineTruncatedClipboardCopy;
