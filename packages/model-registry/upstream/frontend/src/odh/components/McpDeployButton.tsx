import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import McpGatewayRequiredPopover from '~/odh/components/McpGatewayRequiredPopover';
import type { DeployButtonState } from '~/odh/utils/mcpDeployReadiness';

type McpDeployButtonProps = {
  state: DeployButtonState;
  onDeploy: () => void;
  testId: string;
  id?: string;
  ariaLabel?: string;
  children: React.ReactNode;
};

/**
 * The Deploy button of the MCP catalog and MCP registry detail pages. When Deploy is blocked
 * it explains why: in a popover with the gateway docs link when an MCP gateway is missing,
 * otherwise in a tooltip.
 */
const McpDeployButton: React.FC<McpDeployButtonProps> = ({
  state,
  onDeploy,
  testId,
  id,
  ariaLabel,
  children,
}) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const descriptionId = React.useId();
  const showGatewayPopover = !!state.showGatewayDocs && !!state.tooltip;

  const button = (
    <Button
      ref={buttonRef}
      id={id}
      aria-label={ariaLabel}
      variant={ButtonVariant.primary}
      onClick={() => {
        if (state.enabled) {
          onDeploy();
        }
      }}
      isAriaDisabled={!state.enabled}
      isLoading={state.loading}
      aria-describedby={showGatewayPopover ? descriptionId : undefined}
      data-testid={testId}
    >
      {children}
    </Button>
  );

  if (!state.tooltip) {
    return button;
  }
  // A popover instead of a tooltip so the docs link can be reached with the mouse or the
  // keyboard; the page headers have no room for the link next to their own actions.
  if (showGatewayPopover) {
    return (
      <McpGatewayRequiredPopover
        explanation={state.tooltip}
        triggerRef={buttonRef}
        descriptionId={descriptionId}
      >
        {button}
      </McpGatewayRequiredPopover>
    );
  }
  return <Tooltip content={state.tooltip}>{button}</Tooltip>;
};

export default McpDeployButton;
