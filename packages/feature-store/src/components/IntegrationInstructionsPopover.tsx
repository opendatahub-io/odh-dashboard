import * as React from 'react';
import { Popover, Stack, StackItem, Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';

type IntegrationInstructionsPopoverProps = {
  trigger?: React.ReactElement;
  onFooterClick?: () => void;
  className?: string;
};

const IntegrationInstructionsPopover: React.FC<IntegrationInstructionsPopoverProps> = ({
  trigger,
  onFooterClick,
  className,
}) => {
  const footerContent = (
    <Stack>
      <StackItem>
        <Link
          to="/projects"
          onClick={onFooterClick}
          data-testid="integration-instructions-footer-link"
        >
          Go to <strong>Data science projects</strong>
        </Link>
      </StackItem>
    </Stack>
  );

  const popoverContent = (
    <Stack hasGutter>
      <StackItem>
        <p>
          To connect a feature store to a workbench, the workbench must belong to a project that has
          permission to access the feature store.
          <br />
          <br />
          In a project with the required permission, create or edit a workbench and select the
          desired feature store in the <strong>Connected feature stores</strong> field.
        </p>
      </StackItem>
      <StackItem>{footerContent}</StackItem>
    </Stack>
  );

  return (
    <Popover
      showClose
      hasAutoWidth
      maxWidth="400px"
      position="bottom"
      headerContent="Integration instructions"
      bodyContent={popoverContent}
      className={className}
      data-testid="integration-instructions-popover"
    >
      {trigger || (
        <Button
          variant="link"
          data-testid="integration-instructions-trigger"
          isInline
          style={{ textDecoration: 'none' }}
        >
          How to connect workbenches.
        </Button>
      )}
    </Popover>
  );
};

export default IntegrationInstructionsPopover;
