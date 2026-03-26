import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import McpDeployModalExtension from '~/odh/components/McpDeployModalExtension';

const McpDeployButton: React.FC = () => (
  <McpDeployModalExtension
    render={(buttonState, onOpenModal, isModalAvailable) => {
      const deployButton = (
        <Button
          id="mcp-deploy-button"
          aria-label="Deploy MCP server"
          variant={ButtonVariant.primary}
          onClick={onOpenModal}
          isAriaDisabled={!buttonState.enabled}
          data-testid="mcp-deploy-button"
        >
          Deploy MCP server
        </Button>
      );

      return isModalAvailable ? (
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
          ) : (
            deployButton
          )}
        </FlexItem>
      ) : null;
    }}
  />
);

export default McpDeployButton;