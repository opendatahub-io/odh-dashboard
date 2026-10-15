import * as React from 'react';
import { ButtonProps } from '@patternfly/react-core';
type PreviewButtonProps = {
    label: string;
    onClick: () => void;
    isDisabled: boolean;
    isLoading?: boolean;
    variant?: ButtonProps['variant'];
    testId?: string;
    disabledTooltip?: string;
};
declare const PreviewButton: React.FC<PreviewButtonProps>;
export default PreviewButton;
