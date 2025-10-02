import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { CodeIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { ChatbotContext } from '~/app/context/ChatbotContext';

type ChatbotHeaderActionsProps = {
  onViewCode: () => void;
  onConfigurePlayground: () => void;
  onDeletePlayground: () => void;
};

const ChatbotHeaderActions: React.FC<ChatbotHeaderActionsProps> = ({
  onViewCode,
  onConfigurePlayground,
  onDeletePlayground,
}) => {
  const { lsdStatus, lastInput, selectedModel } = React.useContext(ChatbotContext);
  const isViewCodeDisabled = !lastInput || !selectedModel;
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);

  // Get disabled reason for popover
  const getDisabledReason = () => {
    if (!lastInput && !selectedModel) {
      return 'Please input a message and select a model to generate code';
    }
    if (!lastInput) {
      return 'Please input a message to generate code';
    }
    if (!selectedModel) {
      return 'Please select a model to generate code';
    }
    return '';
  };

  return (
    <ActionList>
      <ActionListGroup>
        {lsdStatus?.phase === 'Ready' && (
          <ActionListItem>
            {isViewCodeDisabled ? (
              <Tooltip content={getDisabledReason()}>
                <Button
                  variant="secondary"
                  aria-label="View generated code (disabled)"
                  icon={<CodeIcon />}
                  isAriaDisabled={isViewCodeDisabled}
                >
                  View Code
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="secondary"
                aria-label="View generated code"
                icon={<CodeIcon />}
                onClick={onViewCode}
              >
                View Code
              </Button>
            )}
          </ActionListItem>
        )}
        <ActionListItem>
          <Dropdown
            onSelect={() => setDropdownOpen(false)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                variant="plain"
                isExpanded={isDropdownOpen}
                aria-label="Action list single group kebab"
                icon={<EllipsisVIcon />}
              />
            )}
            isOpen={isDropdownOpen}
            onOpenChange={(isOpen) => setDropdownOpen(isOpen)}
            popperProps={{ position: 'end', preventOverflow: true }}
          >
            <DropdownList>
              <DropdownItem
                onClick={onConfigurePlayground}
                key="update-configuration"
                isDisabled={!lsdStatus}
              >
                Update configuration
              </DropdownItem>
              <Divider />
              <DropdownItem
                onClick={onDeletePlayground}
                key="delete-playground"
                isDisabled={!lsdStatus}
              >
                Delete playground
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ActionListItem>
      </ActionListGroup>
    </ActionList>
  );
};

export default ChatbotHeaderActions;
