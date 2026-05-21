import * as React from 'react';
import { PopoverPosition } from '@patternfly/react-core';
type AdminHelpActionProps = {
    buttonLabel?: string;
    linkTestId?: string;
    headerContent?: string;
    leadText?: string;
    contentTestId?: string;
    popoverPosition?: PopoverPosition;
};
declare const AdminHelpAction: React.FC<AdminHelpActionProps>;
export default AdminHelpAction;
