import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
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
  const [isTokenVisible, setIsTokenVisible] = React.useState(false);

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

  const visibleToken = atob(token.data.token);
  const hiddenToken = '•'.repeat(Math.min(visibleToken.length, 40));

  return (
    <>
      <Button
        variant="plain"
        aria-label={isTokenVisible ? 'Hide token' : 'Show token'}
        onClick={() => setIsTokenVisible(!isTokenVisible)}
        style={{ padding: 0, marginLeft: -40 }}
      >
        {isTokenVisible ? <EyeSlashIcon /> : <EyeIcon />}
      </Button>
      {isTokenVisible ? (
        <InlineTruncatedClipboardCopy
          testId="token-secret"
          textToCopy={visibleToken}
          truncatePosition="middle"
          maxWidth={500}
        />
      ) : (
        <ClipboardCopy
          variant={ClipboardCopyVariant.inlineCompact}
          hoverTip="Copy"
          clickTip="Copied"
          data-testid="token-secret"
          onCopy={() => {
            navigator.clipboard.writeText(visibleToken);
          }}
        >
          {hiddenToken}
        </ClipboardCopy>
      )}
    </>
  );
};

export default ServingRuntimeTokenDisplay;
