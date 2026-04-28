import * as React from 'react';
import { ButtonProps } from '@patternfly/react-core';
type PreviewButtonProps = {
    onClick: () => void;
    isDisabled: boolean;
    isLoading?: boolean;
    variant?: ButtonProps['variant'];
    testId?: string;
};
declare const PreviewButton: React.FC<PreviewButtonProps>;
export default PreviewButton;
