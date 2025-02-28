import * as React from 'react';
import { PopoverPosition } from '@patternfly/react-core';
type Props = {
    buttonLabel?: string;
    headerContent?: string;
    leadText?: string;
    isInline?: boolean;
    contentTestId?: string;
    linkTestId?: string;
    popoverPosition?: PopoverPosition;
};
declare const WhosMyAdministrator: React.FC<Props>;
export default WhosMyAdministrator;
