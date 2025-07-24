import * as React from 'react';
import { ButtonProps } from '@patternfly/react-core';
type ModelRegistryCreateModalFooterProps = {
  submitLabel: string;
  submitButtonVariant?: ButtonProps['variant'];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitDisabled?: boolean;
  isSubmitLoading?: boolean;
  isCancelDisabled?: boolean;
  alertTitle?: string;
  error?: Error;
  alertLinks?: React.ReactNode;
};
declare const ModelRegistryCreateModalFooter: React.FC<ModelRegistryCreateModalFooterProps>;
export default ModelRegistryCreateModalFooter;
