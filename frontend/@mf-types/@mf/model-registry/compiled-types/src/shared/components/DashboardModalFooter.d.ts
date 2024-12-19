import * as React from 'react';
import { ButtonProps } from '@patternfly/react-core';
type DashboardModalFooterProps = {
    submitLabel: string;
    submitButtonVariant?: ButtonProps['variant'];
    onSubmit: () => void;
    onCancel: () => void;
    isSubmitDisabled: boolean;
    isSubmitLoading?: boolean;
    isCancelDisabled?: boolean;
};
declare const DashboardModalFooter: React.FC<DashboardModalFooterProps>;
export default DashboardModalFooter;
