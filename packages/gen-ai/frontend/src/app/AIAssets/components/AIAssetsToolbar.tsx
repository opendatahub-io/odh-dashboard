import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  ButtonVariant,
  Popover,
} from '@patternfly/react-core';

const AIAssetsToolbar: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handlePopoverToggle = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handlePopoverClose = () => {
    setIsPopoverOpen(false);
  };

  return (
    <Toolbar data-testid="ai-assets-toolbar">
      <ToolbarContent style={{ justifyContent: 'flex-end' }}>
        <ToolbarGroup variant="action-group">
          <ToolbarItem>
            <Popover
              isVisible={isPopoverOpen}
              shouldClose={handlePopoverClose}
              shouldOpen={handlePopoverToggle}
              position="bottom"
              showClose
              hasAutoWidth
              maxWidth="332px"
              headerContent={
                <div style={{ padding: '16px 16px 0 16px' }}>
                  To make a model deployment available:
                </div>
              }
              bodyContent={
                <div style={{ padding: '0 16px 16px 16px' }}>
                  <ol
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--pf-t--global--spacer--sm)',
                      paddingLeft: 'var(--pf-t--global--spacer--lg)',
                      fontSize: 'var(--pf-t--global--font--size--body--default)',
                    }}
                  >
                    <li>
                      Go to your <strong>model deployments</strong> page
                    </li>
                    <li>
                      Select &apos;<strong>Edit</strong>&apos; to update your deployment
                    </li>
                    <li>
                      Check the box: &apos;
                      <strong>Make this deployment available as an AI Asset</strong>&apos;
                    </li>
                  </ol>
                </div>
              }
            >
              <Button variant={ButtonVariant.link} data-testid="dont-see-model-button">
                Don&apos;t see the model you&apos;re looking for?
              </Button>
            </Popover>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default AIAssetsToolbar;
