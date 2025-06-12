import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { SecretKind } from '#~/k8sTypes';
import InlineTruncatedClipboardCopy from '#~/components/InlineTruncatedClipboardCopy';

type ServingRuntimeTokenDisplayProps = {
  token: SecretKind;
  loaded: boolean;
  error: Error | undefined;
};

const ServingRuntimeTokenDisplay: React.FC<ServingRuntimeTokenDisplayProps> = ({
  token,
  loaded,
  error,
}) => {
  if (!loaded) {
    return <Skeleton />;
  }

  if (error || token.data?.token === undefined) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">Failed to get token. {error?.message}</HelperTextItem>
      </HelperText>
    );
  }

  return (
    <InlineTruncatedClipboardCopy
      testId="token-secret"
      textToCopy={atob(token.data.token)}
      truncatePosition="middle"
    />
  );
};

export default ServingRuntimeTokenDisplay;
