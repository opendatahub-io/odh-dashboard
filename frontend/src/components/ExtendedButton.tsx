import * as React from 'react';
import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { getGenericErrorCode } from '#~/api/errorUtils';

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

  // Check for errors first - an error means loading is complete (with failure)
  if (loadProps.error) {
    const is403 = getGenericErrorCode(loadProps.error) === 403;
    const errorTooltip = is403
      ? 'You do not have permission to perform this action'
      : 'Could not load required data';

    return (
      <>
        <Button
          {...props}
          ref={tooltipRef}
          isAriaDisabled
          aria-describedby="error-button-tooltip"
          data-testid="error-button"
        >
          {props.children}
        </Button>
        <Tooltip id="error-button-tooltip" content={errorTooltip} triggerRef={tooltipRef} />
      </>
    );
  }

  if (!loadProps.loaded) {
    return <Skeleton data-testid="skeleton-loader" style={{ width: 200 }} />;
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
