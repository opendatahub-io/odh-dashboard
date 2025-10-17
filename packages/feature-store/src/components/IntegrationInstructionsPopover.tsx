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
          To integrate feature store repos with a workbench, navigate to your Data Science Project
          and select the Feature store integration tab.
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
          Learn how to connect.
        </Button>
      )}
    </Popover>
  );
};

export default IntegrationInstructionsPopover;
