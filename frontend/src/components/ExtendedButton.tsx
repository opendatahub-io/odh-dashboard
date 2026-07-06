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
  const tooltipRef = React.useRef<HTMLButtonElement | null>(null);

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

  return (
    <>
      <Button
        {...props}
        ref={tooltipRef}
        isAriaDisabled={tooltipProps.isEnabled}
        aria-describedby={tooltipProps.isEnabled ? 'button-tooltip' : undefined}
      >
        {props.children}
      </Button>
      {tooltipProps.isEnabled && (
        <Tooltip id="button-tooltip" content={tooltipProps.content} triggerRef={tooltipRef} />
      )}
    </>
  );
};

export default ExtendedButton;
