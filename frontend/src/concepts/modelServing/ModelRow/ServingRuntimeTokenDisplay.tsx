import * as React from 'react';
import {
  Button,
  ClipboardCopy,
  ClipboardCopyAction,
  ClipboardCopyVariant,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { SecretKind } from '#~/k8sTypes';

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

  const toggleAction = (
    <ClipboardCopyAction>
      <Button
        variant="plain"
        hasNoPadding
        aria-label={isTokenVisible ? 'Hide token' : 'Show token'}
        icon={isTokenVisible ? <EyeSlashIcon /> : <EyeIcon />}
        onClick={() => setIsTokenVisible(!isTokenVisible)}
      />
    </ClipboardCopyAction>
  );

  return (
    <ClipboardCopy
      variant={ClipboardCopyVariant.inlineCompact}
      style={isTokenVisible ? { maxWidth: '500px' } : undefined}
      hoverTip="Copy"
      clickTip="Copied"
      data-testid="token-secret"
      additionalActions={toggleAction}
      truncation={isTokenVisible ? { position: 'middle' } : undefined}
      onCopy={() => {
        navigator.clipboard.writeText(visibleToken);
      }}
    >
      {isTokenVisible ? visibleToken : hiddenToken}
    </ClipboardCopy>
  );
};

export default ServingRuntimeTokenDisplay;
