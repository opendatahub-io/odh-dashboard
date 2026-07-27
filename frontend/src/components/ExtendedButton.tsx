import * as React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Skeleton,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type TooltipProps = { isEnabled: true; content: React.ReactNode } | { isEnabled: false };

type ExtendedButtonProps = {
  loadProps?: { loaded: boolean; error?: Error };
  tooltipProps?: TooltipProps;
} & React.ComponentProps<typeof Button>;

const ExtendedButton: React.FC<ExtendedButtonProps> = ({
  loadProps = { loaded: true },
  tooltipProps = { isEnabled: false },
  ...props
}) => {
  const tooltipId = React.useId();

  if (!loadProps.loaded) {
    return <Skeleton data-testid="skeleton-loader" style={{ width: 200 }} />;
  }

  if (loadProps.error) {
    return (
      <Flex
        data-testid="error-content"
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <FlexItem>
          <Popover aria-label="Error popover" bodyContent={loadProps.error.message}>
            <Icon status="danger" size="sm" data-testid="error-icon">
              <ExclamationCircleIcon />
            </Icon>
          </Popover>
        </FlexItem>
        <FlexItem>
          <Content component={ContentVariants.small}>Could not load required data</Content>
        </FlexItem>
      </Flex>
    );
  }

  if (tooltipProps.isEnabled) {
    return (
      <Tooltip id={tooltipId} content={tooltipProps.content}>
        <Button {...props} isAriaDisabled aria-describedby={tooltipId}>
          {props.children}
        </Button>
      </Tooltip>
    );
  }

  return <Button {...props}>{props.children}</Button>;
};

export default ExtendedButton;
