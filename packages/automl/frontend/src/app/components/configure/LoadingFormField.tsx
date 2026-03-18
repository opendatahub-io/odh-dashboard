import { Skeleton } from '@patternfly/react-core';
import React from 'react';

interface LoadingFormFieldProps {
  loading: boolean;
  children: React.ReactNode;
}

function LoadingFormField({ loading, children }: LoadingFormFieldProps): React.JSX.Element {
  if (loading) {
    return <Skeleton shape="square" width="100%" height="36px" />;
  }

  return <>{children}</>;
}

export default LoadingFormField;
