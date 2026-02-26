import * as React from 'react';
import { Button, Split, SplitItem, Title } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';

type ErrorFallbackLayoutProps = {
  onClose?: () => void;
  reloadButtonTestId?: string;
  closeButtonTestId?: string;
  children?: React.ReactNode;
};

const ErrorFallbackLayout: React.FC<ErrorFallbackLayoutProps> = ({
  onClose,
  reloadButtonTestId = 'reload-link',
  closeButtonTestId = 'close-error-button',
  children,
}) => (
  <>
    <Split>
      <SplitItem isFilled>
        <Title headingLevel="h1" className="pf-v6-u-mb-sm">
          An error occurred
        </Title>
        <p className="pf-v6-u-mb-md">
          Try{' '}
          <Button
            data-testid={reloadButtonTestId}
            variant="link"
            isInline
            onClick={() => window.location.reload()}
          >
            reloading
          </Button>{' '}
          the page if there was a recent update.
        </p>
      </SplitItem>
      {onClose ? (
        <SplitItem>
          <Button
            icon={<TimesIcon />}
            data-testid={closeButtonTestId}
            variant="plain"
            aria-label="Close"
            onClick={onClose}
          />
        </SplitItem>
      ) : null}
    </Split>
    {children}
  </>
);

export default ErrorFallbackLayout;
